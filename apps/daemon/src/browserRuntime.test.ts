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
  getSuperiorBrowserEvents,
  startSuperiorBrowser
} from "./browserRuntime.js";

let testRoot = "";

const previousStateDirectory = process.env.CLAWDBOT_STATE_DIR;
const previousBrowserPath = process.env.SUPERIOR_BROWSER_PATH;
const previousExtensionPath = process.env.SUPERIOR_EXTENSION_PATH;
const previousProgramFiles = process.env.ProgramFiles;
const previousProgramFilesX86 = process.env["ProgramFiles(x86)"];
const previousLocalAppData = process.env.LOCALAPPDATA;

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
  restoreEnv("ProgramFiles", previousProgramFiles);
  restoreEnv("ProgramFiles(x86)", previousProgramFilesX86);
  restoreEnv("LOCALAPPDATA", previousLocalAppData);
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

  it("falls back to Edge when installed Chrome blocks command-line extension loading", () => {
    const programFiles = join(testRoot, "Program Files");
    const chromeApplicationPath = join(programFiles, "Google", "Chrome", "Application");
    const edgeApplicationPath = join(programFiles, "Microsoft", "Edge", "Application");
    const chromePath = join(chromeApplicationPath, "chrome.exe");
    const edgePath = join(edgeApplicationPath, "msedge.exe");

    mkdirSync(join(chromeApplicationPath, "148.0.7778.179"), {
      recursive: true
    });
    mkdirSync(edgeApplicationPath, {
      recursive: true
    });
    writeFileSync(chromePath, "", "utf8");
    writeFileSync(edgePath, "", "utf8");
    process.env.ProgramFiles = programFiles;
    delete process.env["ProgramFiles(x86)"];
    delete process.env.LOCALAPPDATA;

    expect(findBrowserExecutable()).toEqual({
      kind: "edge",
      path: edgePath
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

  it("returns a typed empty event feed when no playpen has run", () => {
    const events = getSuperiorBrowserEvents();

    expect(events.type).toBe("superior-browser-events");
    expect(events.items).toEqual([]);
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
