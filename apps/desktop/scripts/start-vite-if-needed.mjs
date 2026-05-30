import { spawn } from "node:child_process";

const devUrl = "http://127.0.0.1:5173/";

if (await isAlive(devUrl)) {
  console.log(`SUPERIOR desktop web server already running at ${devUrl}`);
  process.exit(0);
}

const child = spawn("corepack", ["pnpm", "dev:vite:raw"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32"
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

async function isAlive(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(800)
    });

    return response.ok;
  } catch {
    return false;
  }
}
