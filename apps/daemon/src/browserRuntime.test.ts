import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_BOT_IDENTITY, createSuperiorBrowserStartRequest } from "@clawdbot/shared";
import {
  BrowserRuntimeError,
  findBrowserExecutable,
  findExtensionFolder,
  getProfilePath,
  startSuperiorBrowser
} from "./browserRuntime.js";

let testRoot = "";

const previousStateDirectory = process.env.CLAWDBOT_STATE_DIR;
const previousBrowserPath = process.env.SUPERIOR_BROWSER_PATH;
const previousExtensionPath = process.env.SUPERIOR_EXTENSION_PATH;

beforeEach(() => {
  testRoot = mkdtempSync(join(tmpdir(), "superior-browser-runtime-"));
  process.env.CLAWDBOT_STATE_DIR = join(testRoot, "state");
  delete process.env.SUPERIOR_BROWSER_PATH;
  delete process.env.SUPERIOR_EXTENSION_PATH;
});

afterEach(() => {
  rmSync(testRoot, {
    recursive: true,
    force: true
  });

  restoreEnv("CLAWDBOT_STATE_DIR", previousStateDirectory);
  restoreEnv("SUPERIOR_BROWSER_PATH", previousBrowserPath);
  restoreEnv("SUPERIOR_EXTENSION_PATH", previousExtensionPath);
});

describe("SUPERIOR browser runtime", () => {
  it("keeps repo profiles inside the local browser profile shelf", () => {
    const profilePath = getProfilePath("Acme/Widget Lab");
    const profileRoot = join(process.env.CLAWDBOT_STATE_DIR ?? "", "browser-profiles");

    expect(relative(profileRoot, profilePath).startsWith("..")).toBe(false);
    expect(basename(profilePath)).toBe("acme-widget-lab");
  });

  it("prefers an explicit browser executable path", () => {
    const fakeBrowserPath = join(testRoot, "Google Chrome.exe");

    writeFileSync(fakeBrowserPath, "", "utf8");
    process.env.SUPERIOR_BROWSER_PATH = fakeBrowserPath;

    expect(findBrowserExecutable()).toEqual({
      kind: "chrome",
      path: fakeBrowserPath
    });
  });

  it("finds the staged extension from an explicit folder", () => {
    const extensionPath = join(testRoot, "extension-dist");

    mkdirSync(extensionPath, {
      recursive: true
    });
    writeFileSync(join(extensionPath, "manifest.json"), "{}", "utf8");
    process.env.SUPERIOR_EXTENSION_PATH = extensionPath;

    expect(findExtensionFolder()).toBe(extensionPath);
  });

  it("finds the dev extension dist from a workspace", () => {
    const workspaceRoot = join(testRoot, "workspace");
    const daemonPath = join(workspaceRoot, "apps", "daemon");
    const extensionPath = join(workspaceRoot, "apps", "extension", "dist");

    mkdirSync(daemonPath, {
      recursive: true
    });
    mkdirSync(extensionPath, {
      recursive: true
    });
    writeFileSync(join(workspaceRoot, "pnpm-workspace.yaml"), "", "utf8");
    writeFileSync(join(extensionPath, "manifest.json"), "{}", "utf8");

    expect(findExtensionFolder(daemonPath)).toBe(extensionPath);
  });

  it("rejects unknown repo workspace ids before launching a browser", async () => {
    const request = createSuperiorBrowserStartRequest({
      repoWorkspaceId: "unknown/repo",
      bot: DEFAULT_BOT_IDENTITY
    });

    await expect(startSuperiorBrowser(request)).rejects.toMatchObject<Partial<BrowserRuntimeError>>({
      code: "unknown_repo"
    });
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
