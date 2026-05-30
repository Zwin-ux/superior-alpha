import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, parse, resolve } from "node:path";

export function getSuperiorStateDirectory(startDirectory = process.cwd()): string {
  if (process.env.CLAWDBOT_STATE_DIR) {
    return resolve(process.env.CLAWDBOT_STATE_DIR);
  }

  const workspaceRoot = findUpDirectory("pnpm-workspace.yaml", startDirectory);

  if (workspaceRoot) {
    return join(workspaceRoot, ".clawdbot");
  }

  return getUserStateDirectory();
}

export function findUp(fileName: string, startDirectory: string): string | undefined {
  const directory = findUpDirectory(fileName, startDirectory);

  return directory ? join(directory, fileName) : undefined;
}

export function findUpDirectory(fileName: string, startDirectory: string): string | undefined {
  let current = resolve(startDirectory);
  const root = parse(current).root;

  while (true) {
    const candidate = join(current, fileName);

    if (existsSync(candidate)) {
      return current;
    }

    if (current === root) {
      return undefined;
    }

    current = dirname(current);
  }
}

function getUserStateDirectory(): string {
  if (platform() === "win32") {
    return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "SUPERIOR", ".clawdbot");
  }

  if (platform() === "darwin") {
    return join(homedir(), "Library", "Application Support", "SUPERIOR", ".clawdbot");
  }

  return join(process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state"), "superior");
}
