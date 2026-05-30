import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findUp, getSuperiorStateDirectory } from "./localPaths.js";

const workspaceFixture = join(process.cwd(), ".test-local-paths-workspace");
const overrideStateDirectory = join(process.cwd(), ".test-local-paths-state");

const previousStateDirectory = process.env.CLAWDBOT_STATE_DIR;

beforeEach(() => {
  delete process.env.CLAWDBOT_STATE_DIR;

  rmSync(workspaceFixture, {
    recursive: true,
    force: true
  });
  rmSync(overrideStateDirectory, {
    recursive: true,
    force: true
  });
});

afterEach(() => {
  rmSync(workspaceFixture, {
    recursive: true,
    force: true
  });
  rmSync(overrideStateDirectory, {
    recursive: true,
    force: true
  });

  if (previousStateDirectory === undefined) {
    delete process.env.CLAWDBOT_STATE_DIR;
  } else {
    process.env.CLAWDBOT_STATE_DIR = previousStateDirectory;
  }
});

describe("local paths", () => {
  it("uses an explicit state directory override", () => {
    process.env.CLAWDBOT_STATE_DIR = overrideStateDirectory;

    expect(getSuperiorStateDirectory()).toBe(resolve(overrideStateDirectory));
  });

  it("uses the workspace .clawdbot folder during development", () => {
    const nestedFolder = join(workspaceFixture, "apps", "daemon");

    mkdirSync(nestedFolder, {
      recursive: true
    });
    writeFileSync(join(workspaceFixture, "pnpm-workspace.yaml"), "", "utf8");

    expect(getSuperiorStateDirectory(nestedFolder)).toBe(join(workspaceFixture, ".clawdbot"));
  });

  it("finds a file above the current folder", () => {
    const nestedFolder = join(workspaceFixture, "a", "b");
    const envPath = join(workspaceFixture, ".env.local");

    mkdirSync(nestedFolder, {
      recursive: true
    });
    writeFileSync(envPath, "OPENAI_API_KEY=test", "utf8");

    expect(existsSync(envPath)).toBe(true);
    expect(findUp(".env.local", nestedFolder)).toBe(envPath);
  });
});
