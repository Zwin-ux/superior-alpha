import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

export interface SteamLibraryFolder {
  path: string;
  apps: Record<string, string>;
}

export interface SteamAppManifest {
  appId: string;
  name?: string;
  installDir?: string;
}

export interface SteamAppInstall {
  appId: string;
  name: string;
  libraryPath: string;
  installDir: string;
  manifestPath: string;
}

export function findSteamLibraryFolders(steamRoot = findDefaultSteamRoot()): SteamLibraryFolder[] {
  if (!steamRoot) {
    return [];
  }

  const libraryFoldersPath = join(steamRoot, "steamapps", "libraryfolders.vdf");
  const folders: SteamLibraryFolder[] = [
    {
      path: steamRoot,
      apps: {}
    }
  ];

  if (!existsSync(libraryFoldersPath)) {
    return folders;
  }

  const parsedFolders = parseSteamLibraryFolders(readFileSync(libraryFoldersPath, "utf8"));
  const normalizedRoot = normalize(steamRoot).toLowerCase();

  for (const folder of parsedFolders) {
    const normalizedPath = normalize(folder.path).toLowerCase();

    if (normalizedPath === normalizedRoot || folders.some((item) => normalize(item.path).toLowerCase() === normalizedPath)) {
      continue;
    }

    folders.push(folder);
  }

  return folders;
}

export function findSteamAppInstall(appId: string, steamRoot = findDefaultSteamRoot()): SteamAppInstall | null {
  for (const library of findSteamLibraryFolders(steamRoot)) {
    const manifestPath = join(library.path, "steamapps", `appmanifest_${appId}.acf`);

    if (!existsSync(manifestPath)) {
      continue;
    }

    const manifest = parseSteamAppManifest(readFileSync(manifestPath, "utf8"));
    const installDir = manifest.installDir;

    if (!installDir) {
      continue;
    }

    return {
      appId,
      name: manifest.name ?? `Steam app ${appId}`,
      libraryPath: library.path,
      installDir,
      manifestPath
    };
  }

  return null;
}

export function parseSteamLibraryFolders(text: string): SteamLibraryFolder[] {
  const folders: SteamLibraryFolder[] = [];
  const libraryRoot = /"libraryfolders"\s*\{([\s\S]*)\}\s*$/i.exec(text)?.[1] ?? text;
  const libraryBlocks = [...libraryRoot.matchAll(/"(\d+)"\s*\{([\s\S]*?)(?=\n\s*"\d+"\s*\{|\n\s*\}\s*$)/g)];

  for (const block of libraryBlocks) {
    const body = block[2] ?? "";
    const path = readVdfString(body, "path");

    if (!path) {
      continue;
    }

    const apps: Record<string, string> = {};
    const appsBlock = /"apps"\s*\{([\s\S]*?)\n\s*\}/.exec(body)?.[1] ?? "";

    for (const app of appsBlock.matchAll(/"(\d+)"\s*"([^"]+)"/g)) {
      apps[app[1] ?? ""] = app[2] ?? "";
    }

    folders.push({
      path: path.replace(/\\\\/g, "\\"),
      apps
    });
  }

  return folders;
}

export function parseSteamAppManifest(text: string): SteamAppManifest {
  const name = readVdfString(text, "name");
  const installDir = readVdfString(text, "installdir");

  return {
    appId: readVdfString(text, "appid") ?? "",
    ...(name ? { name } : {}),
    ...(installDir ? { installDir } : {})
  };
}

export function findDefaultSteamRoot(): string | null {
  const envRoot = process.env.SUPERIOR_STEAM_PATH?.trim();

  if (envRoot && existsSync(envRoot)) {
    return envRoot;
  }

  const candidates = [
    process.env["ProgramFiles(x86)"] ? join(process.env["ProgramFiles(x86)"] as string, "Steam") : undefined,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Steam") : undefined,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Steam") : undefined
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function readVdfString(text: string, key: string): string | undefined {
  return new RegExp(`"${escapeRegExp(key)}"\\s*"([^"]+)"`, "i").exec(text)?.[1];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
