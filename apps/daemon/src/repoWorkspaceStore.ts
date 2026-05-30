import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { RepoReaderResult, RepoWorkspaceRecord, RepoWorkspaceRecordsResponse } from "@clawdbot/shared";
import { getSuperiorStateDirectory } from "./localPaths.js";

const repoWorkspaceFileName = "repo-workspaces.json";
const maxRepoWorkspaceRecords = 32;

interface StoredRepoWorkspaceRecords {
  items: RepoWorkspaceRecord[];
}

export function readRepoWorkspaceRecords(): RepoWorkspaceRecordsResponse {
  return {
    type: "repo-workspace-records",
    items: readStoredRepoWorkspaceRecords().items,
    createdAt: new Date().toISOString()
  };
}

export function readRepoWorkspaceRecord(repoWorkspaceId: string): RepoWorkspaceRecord | null {
  const normalizedId = repoWorkspaceId.trim().toLowerCase();

  if (!normalizedId) {
    return null;
  }

  return readStoredRepoWorkspaceRecords().items.find((item) => item.id === normalizedId) ?? null;
}

export function rememberRepoWorkspaceRecord(result: RepoReaderResult): RepoWorkspaceRecord {
  const stored = readStoredRepoWorkspaceRecords();
  const id = createRepoWorkspaceId(result);
  const existingRecord = stored.items.find((item) => item.id === id);
  const now = result.createdAt;
  const record: RepoWorkspaceRecord = {
    type: "repo-workspace-record",
    id,
    source: result.source,
    repository: result.repository,
    presentation: result.presentation,
    environment: result.environment,
    playground: result.playground,
    stack: result.stack,
    risks: result.risks,
    nextMoves: result.nextMoves,
    ...(existingRecord?.localPath ? { localPath: existingRecord.localPath } : {}),
    ...(existingRecord?.profilePath ? { profilePath: existingRecord.profilePath } : {}),
    ...(existingRecord?.lastBrowserSessionId ? { lastBrowserSessionId: existingRecord.lastBrowserSessionId } : {}),
    ...(existingRecord?.lastBrowserEventSummary
      ? { lastBrowserEventSummary: existingRecord.lastBrowserEventSummary }
      : {}),
    nextMove: result.nextMoves[0] ?? result.playground.primaryLoop[0] ?? "Start Playpen",
    notes: existingRecord?.notes ?? [],
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now
  };
  const items = [record, ...stored.items.filter((item) => item.id !== id)].slice(0, maxRepoWorkspaceRecords);

  writeStoredRepoWorkspaceRecords({
    items
  });

  return record;
}

export function rememberRepoWorkspaceBrowserSession(
  repoWorkspaceId: string,
  details: {
    sessionId: string;
    profilePath: string;
    lastBrowserEventSummary: string;
  }
): RepoWorkspaceRecord | null {
  const stored = readStoredRepoWorkspaceRecords();
  const normalizedId = repoWorkspaceId.trim().toLowerCase();
  const existingRecord = stored.items.find((item) => item.id === normalizedId);

  if (!existingRecord) {
    return null;
  }

  const record: RepoWorkspaceRecord = {
    ...existingRecord,
    profilePath: details.profilePath,
    lastBrowserSessionId: details.sessionId,
    lastBrowserEventSummary: details.lastBrowserEventSummary,
    nextMove: details.lastBrowserEventSummary,
    updatedAt: new Date().toISOString()
  };
  const items = [record, ...stored.items.filter((item) => item.id !== normalizedId)].slice(0, maxRepoWorkspaceRecords);

  writeStoredRepoWorkspaceRecords({
    items
  });

  return record;
}

function readStoredRepoWorkspaceRecords(): StoredRepoWorkspaceRecords {
  const filePath = getRepoWorkspaceFilePath();

  try {
    if (!existsSync(filePath)) {
      return {
        items: []
      };
    }

    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<StoredRepoWorkspaceRecords>;

    return {
      items: Array.isArray(parsed.items)
        ? parsed.items.filter(isRepoWorkspaceRecord).slice(0, maxRepoWorkspaceRecords)
        : []
    };
  } catch {
    return {
      items: []
    };
  }
}

function writeStoredRepoWorkspaceRecords(records: StoredRepoWorkspaceRecords): void {
  const filePath = getRepoWorkspaceFilePath();

  mkdirSync(dirname(filePath), {
    recursive: true
  });
  writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

function getRepoWorkspaceFilePath(): string {
  return join(getSuperiorStateDirectory(), "repos", repoWorkspaceFileName);
}

function createRepoWorkspaceId(result: RepoReaderResult): string {
  return `${result.repository.owner}/${result.repository.name}`.toLowerCase();
}

function isRepoWorkspaceRecord(item: unknown): item is RepoWorkspaceRecord {
  const candidate = item as Partial<RepoWorkspaceRecord>;

  return (
    candidate.type === "repo-workspace-record" &&
    typeof candidate.id === "string" &&
    typeof candidate.source?.url === "string" &&
    typeof candidate.source?.title === "string" &&
    typeof candidate.repository?.owner === "string" &&
    typeof candidate.repository?.name === "string" &&
    typeof candidate.presentation?.primary === "string" &&
    typeof candidate.environment?.mode === "string" &&
    typeof candidate.playground?.label === "string" &&
    Array.isArray(candidate.stack) &&
    Array.isArray(candidate.risks) &&
    Array.isArray(candidate.nextMoves) &&
    Array.isArray(candidate.notes) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}
