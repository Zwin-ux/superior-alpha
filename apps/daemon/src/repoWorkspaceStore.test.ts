import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepoReaderResult } from "@clawdbot/shared";
import {
  readRepoWorkspaceRecords,
  rememberRepoWorkspaceBrowserSession,
  rememberRepoWorkspaceRecord
} from "./repoWorkspaceStore.js";

const stateDirectory = join(process.cwd(), ".test-repo-workspaces-state");

beforeEach(() => {
  process.env.CLAWDBOT_STATE_DIR = stateDirectory;
});

afterEach(() => {
  if (existsSync(stateDirectory)) {
    rmSync(stateDirectory, {
      recursive: true,
      force: true
    });
  }

  delete process.env.CLAWDBOT_STATE_DIR;
});

describe("repo workspace store", () => {
  it("records the latest playpen read per GitHub repo", () => {
    rememberRepoWorkspaceRecord(createRepoReaderResult("repo_first", "Repo Map"));
    rememberRepoWorkspaceRecord(createRepoReaderResult("repo_second", "SUPERIOR Browser"));

    const records = readRepoWorkspaceRecords();

    expect(records.type).toBe("repo-workspace-records");
    expect(records.items).toHaveLength(1);
    expect(records.items[0]?.id).toBe("acme/widget");
    expect(records.items[0]?.playground.label).toBe("SUPERIOR Browser");
    expect(records.items[0]?.createdAt).toBe("2026-05-30T00:00:00.000Z");
    expect(records.items[0]?.updatedAt).toBe("2026-05-30T00:00:01.000Z");
  });

  it("records the latest browser playpen session on a saved repo", () => {
    rememberRepoWorkspaceRecord(createRepoReaderResult("repo_first", "SUPERIOR Browser"));
    rememberRepoWorkspaceBrowserSession("acme/widget", {
      sessionId: "browser_session_test",
      profilePath: "C:\\state\\browser-profiles\\acme-widget",
      lastBrowserEventSummary: "Extension paired"
    });

    const [record] = readRepoWorkspaceRecords().items;

    expect(record?.profilePath).toContain("acme-widget");
    expect(record?.lastBrowserSessionId).toBe("browser_session_test");
    expect(record?.lastBrowserEventSummary).toBe("Extension paired");
    expect(record?.nextMove).toBe("Extension paired");
  });
});

function createRepoReaderResult(requestId: string, playgroundLabel: string): RepoReaderResult {
  const createdAt = requestId === "repo_first" ? "2026-05-30T00:00:00.000Z" : "2026-05-30T00:00:01.000Z";

  return {
    type: "repo-reader-result",
    requestId,
    source: {
      url: "https://github.com/acme/widget",
      title: "acme/widget"
    },
    repository: {
      owner: "acme",
      name: "widget",
      defaultBranch: "main",
      description: "Widget app.",
      primaryLanguage: "TypeScript",
      stars: 4,
      forks: 1,
      license: "MIT",
      updatedAt: createdAt
    },
    presentation: {
      primary: playgroundLabel === "SUPERIOR Browser" ? "web-app" : "monorepo",
      surfaces: ["web-app", "monorepo"],
      signals: ["interactive app runtime", "workspace layout"],
      surfaceMap: [
        {
          surface: "web-app",
          path: "apps/web",
          confidence: "high",
          reason: "interactive app runtime"
        }
      ]
    },
    environment: {
      mode: "both",
      summary: "Run the app in a controlled browser.",
      steps: [
        {
          label: "Install",
          command: "corepack pnpm install",
          note: "Repo advertises pnpm lockfile."
        }
      ]
    },
    playground: {
      kind: playgroundLabel === "SUPERIOR Browser" ? "superior-browser" : "repo-map",
      label: playgroundLabel,
      robotRole: "Map the repo and choose a runnable surface.",
      permissions: ["read-repo", "local-files"],
      primaryLoop: ["Map repo", "Pick surface"],
      launchTargets: ["apps/web"],
      checks: [],
      notes: []
    },
    summary: "acme/widget presents as a web app.",
    stack: ["TypeScript", "Node"],
    entrypoints: ["apps/web"],
    structure: [],
    risks: ["No obvious first-pass risk."],
    nextMoves: ["Use SUPERIOR Browser as the first playpen."],
    playLoop: ["Map repo", "Pick surface"],
    createdAt
  };
}
