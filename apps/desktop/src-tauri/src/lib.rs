#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DaemonSupervisor::default())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let supervisor = app.state::<DaemonSupervisor>();
            let _ = ensure_daemon_inner(&app_handle, &supervisor);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ensure_daemon,
            open_local_folder,
            open_extension_folder,
            open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running SUPERIOR");
}

use serde::Serialize;
use std::{
    env,
    fs::{self, OpenOptions},
    io::Write,
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::Duration,
};
use tauri::Manager;

#[derive(Default)]
struct DaemonSupervisor {
    child: Mutex<Option<Child>>,
}

impl Drop for DaemonSupervisor {
    fn drop(&mut self) {
        if let Ok(child_slot) = self.child.get_mut() {
            if let Some(child) = child_slot.as_mut() {
                let _ = child.kill();
            }
        }
    }
}

#[derive(Serialize)]
struct DaemonLaunchResult {
    status: &'static str,
    detail: String,
    entry: Option<String>,
}

#[tauri::command]
fn ensure_daemon(
    app: tauri::AppHandle,
    supervisor: tauri::State<'_, DaemonSupervisor>,
) -> DaemonLaunchResult {
    ensure_daemon_inner(&app, &supervisor)
}

#[derive(Serialize)]
struct OpenLocalFolderResult {
    status: &'static str,
    path: String,
}

#[derive(Serialize)]
struct OpenExternalUrlResult {
    status: &'static str,
    url: String,
}

#[tauri::command]
fn open_local_folder(path: String) -> OpenLocalFolderResult {
    let folder = PathBuf::from(path);
    let display_path = folder.display().to_string();

    if !is_allowed_local_folder(&folder) {
        return OpenLocalFolderResult {
            status: "blocked",
            path: display_path,
        };
    }

    if fs::create_dir_all(&folder).is_err() {
        return OpenLocalFolderResult {
            status: "failed",
            path: display_path,
        };
    }

    let opened = open_folder_path(&folder);

    OpenLocalFolderResult {
        status: if opened { "opened" } else { "failed" },
        path: display_path,
    }
}

#[tauri::command]
fn open_extension_folder(app: tauri::AppHandle) -> OpenLocalFolderResult {
    let Some(folder) = find_extension_folder(&app) else {
        return OpenLocalFolderResult {
            status: "missing",
            path: String::new(),
        };
    };
    let display_path = folder.display().to_string();

    OpenLocalFolderResult {
        status: if open_folder_path(&folder) {
            "opened"
        } else {
            "failed"
        },
        path: display_path,
    }
}

#[tauri::command]
fn open_external_url(url: String) -> OpenExternalUrlResult {
    let Ok(parsed) = url::Url::parse(&url) else {
        return OpenExternalUrlResult {
            status: "blocked",
            url,
        };
    };

    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return OpenExternalUrlResult {
            status: "blocked",
            url,
        };
    }

    let opened = if cfg!(windows) {
        Command::new("explorer")
            .arg(&url)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .is_ok()
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&url)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .is_ok()
    } else {
        Command::new("xdg-open")
            .arg(&url)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .is_ok()
    };

    OpenExternalUrlResult {
        status: if opened { "opened" } else { "failed" },
        url,
    }
}

fn ensure_daemon_inner(
    app: &tauri::AppHandle,
    supervisor: &DaemonSupervisor,
) -> DaemonLaunchResult {
    record_launch("ensure_daemon");

    if daemon_port_open() {
        record_launch("daemon already running");
        return DaemonLaunchResult {
            status: "already-running",
            detail: "Local daemon already answered on loopback.".to_string(),
            entry: None,
        };
    }

    let Some(node_path) = find_node(app) else {
        record_launch("node runtime missing");
        return DaemonLaunchResult {
            status: "missing-node",
            detail: "Node.js runtime was not found.".to_string(),
            entry: None,
        };
    };

    let Some(candidate) = find_daemon_entry(app) else {
        record_launch("daemon entry missing");
        return DaemonLaunchResult {
            status: "missing-entry",
            detail: "Daemon runtime file was not found.".to_string(),
            entry: None,
        };
    };

    let child_node_path = child_process_path(&node_path);
    let child_entry = child_process_path(&candidate.entry);
    let child_working_dir = child_process_path(&candidate.working_dir);
    let mut command = Command::new(&child_node_path);
    record_launch(&format!(
        "starting daemon node={} entry={} cwd={}",
        child_node_path.display(),
        child_entry.display(),
        child_working_dir.display()
    ));
    command
        .arg(&child_entry)
        .current_dir(&child_working_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .env("CLAWDBOT_DAEMON_HOST", "127.0.0.1")
        .env("CLAWDBOT_DAEMON_PORT", "5317");

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    let Ok(child) = command.spawn() else {
        record_launch("daemon spawn failed");
        return DaemonLaunchResult {
            status: "failed",
            detail: "SUPERIOR could not start the local daemon.".to_string(),
            entry: Some(candidate.entry.display().to_string()),
        };
    };

    if let Ok(mut child_slot) = supervisor.child.lock() {
        *child_slot = Some(child);
    }

    for _ in 0..30 {
        if daemon_port_open() {
            record_launch("daemon started");
            return DaemonLaunchResult {
                status: "started",
                detail: "SUPERIOR started the local daemon.".to_string(),
                entry: Some(candidate.entry.display().to_string()),
            };
        }

        thread::sleep(Duration::from_millis(100));
    }

    DaemonLaunchResult {
        status: "starting",
        detail: "Daemon process started but has not answered yet.".to_string(),
        entry: Some(candidate.entry.display().to_string()),
    }
}

struct DaemonEntry {
    entry: PathBuf,
    working_dir: PathBuf,
}

fn daemon_port_open() -> bool {
    let address = SocketAddr::from(([127, 0, 0, 1], 5317));
    TcpStream::connect_timeout(&address, Duration::from_millis(160)).is_ok()
}

fn find_node(app: &tauri::AppHandle) -> Option<PathBuf> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        record_launch(&format!("resource_dir {}", resource_dir.display()));

        for resource_root in resource_roots(&resource_dir) {
            let node_path = resource_root.join("node").join(node_binary_name());

            if node_runtime_works(&node_path) {
                record_launch(&format!("using bundled node {}", node_path.display()));
                return Some(node_path);
            }

            record_launch(&format!("bundled node not usable {}", node_path.display()));
        }
    }

    if let Ok(node_path) = env::var("SUPERIOR_NODE_PATH") {
        let node_path = PathBuf::from(node_path);

        if node_runtime_works(&node_path) {
            record_launch(&format!("using SUPERIOR_NODE_PATH {}", node_path.display()));
            return Some(node_path);
        }
    }

    let path_node = PathBuf::from(node_binary_name_without_extension());

    if node_runtime_works(&path_node) {
        record_launch("using PATH node");
        Some(path_node)
    } else {
        None
    }
}

fn node_runtime_works(node_path: &Path) -> bool {
    let Ok(output) = Command::new(node_path)
        .arg("--version")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .output()
    else {
        return false;
    };

    output.status.success()
}

fn node_binary_name() -> &'static str {
    if cfg!(windows) {
        "node.exe"
    } else {
        "node"
    }
}

fn node_binary_name_without_extension() -> &'static str {
    "node"
}

fn find_daemon_entry(app: &tauri::AppHandle) -> Option<DaemonEntry> {
    if let Ok(entry) = env::var("SUPERIOR_DAEMON_ENTRY") {
        let entry = PathBuf::from(entry);

        if entry.exists() {
            return Some(DaemonEntry {
                working_dir: entry.parent().unwrap_or(Path::new(".")).to_path_buf(),
                entry,
            });
        }
    }

    for start in daemon_search_roots(app) {
        if let Some(workspace_root) = find_up(&start, "pnpm-workspace.yaml") {
            let entry = workspace_root.join("apps").join("daemon").join("dist").join("server.js");

            if entry.exists() {
                return Some(DaemonEntry {
                    entry,
                    working_dir: workspace_root,
                });
            }
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        for resource_root in resource_roots(&resource_dir) {
            let entry = resource_root.join("daemon").join("server.mjs");

            if entry.exists() {
                record_launch(&format!("using bundled daemon {}", entry.display()));
                return Some(DaemonEntry {
                    working_dir: resource_root,
                    entry,
                });
            }
        }
    }

    None
}

fn find_extension_folder(app: &tauri::AppHandle) -> Option<PathBuf> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        for resource_root in resource_roots(&resource_dir) {
            let extension_folder = resource_root.join("extension");

            if extension_folder.join("manifest.json").exists() {
                return Some(extension_folder);
            }
        }
    }

    for start in daemon_search_roots(app) {
        if let Some(workspace_root) = find_up(&start, "pnpm-workspace.yaml") {
            let extension_folder = workspace_root.join("apps").join("extension").join("dist");

            if extension_folder.join("manifest.json").exists() {
                return Some(extension_folder);
            }
        }
    }

    None
}

fn resource_roots(resource_dir: &Path) -> [PathBuf; 2] {
    [resource_dir.to_path_buf(), resource_dir.join("resources")]
}

fn record_launch(message: &str) {
    let path = env::temp_dir().join("superior-daemon-launch.log");

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{}", message);
    }
}

fn daemon_search_roots(app: &tauri::AppHandle) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(root) = env::var("SUPERIOR_WORKSPACE_ROOT") {
        roots.push(PathBuf::from(root));
    }

    if let Ok(root) = env::var("CLAWDBOT_WORKSPACE_ROOT") {
        roots.push(PathBuf::from(root));
    }

    if let Ok(current_dir) = env::current_dir() {
        roots.push(current_dir);
    }

    if let Ok(exe_path) = env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            roots.push(parent.to_path_buf());
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        roots.push(resource_dir);
    }

    roots
}

fn find_up(start: &Path, marker: &str) -> Option<PathBuf> {
    let mut current = if start.is_file() {
        start.parent()?.to_path_buf()
    } else {
        start.to_path_buf()
    };

    loop {
        if current.join(marker).exists() {
            return Some(current);
        }

        if !current.pop() {
            return None;
        }
    }
}

fn is_allowed_local_folder(path: &Path) -> bool {
    path.file_name()
        .and_then(|file_name| file_name.to_str())
        .is_some_and(|file_name| file_name.eq_ignore_ascii_case(".clawdbot"))
}

fn open_folder_path(folder: &Path) -> bool {
    let child_folder = child_process_path(folder);

    if cfg!(windows) {
        Command::new("explorer")
            .arg(&child_folder)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .is_ok()
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&child_folder)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .is_ok()
    } else {
        Command::new("xdg-open")
            .arg(&child_folder)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .is_ok()
    }
}

fn child_process_path(path: &Path) -> PathBuf {
    #[cfg(windows)]
    {
        let value = path.to_string_lossy();
        let unc_prefix = "\\\\?\\UNC\\";
        let verbatim_prefix = "\\\\?\\";

        if let Some(rest) = value.strip_prefix(unc_prefix) {
            return PathBuf::from(format!("\\\\{}", rest));
        }

        if let Some(rest) = value.strip_prefix(verbatim_prefix) {
            return PathBuf::from(rest);
        }
    }

    path.to_path_buf()
}
