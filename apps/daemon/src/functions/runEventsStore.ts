import {
  SuperiorFunctionRunEvent,
  SuperiorFunctionRunEventsResponse,
  SuperiorFunctionRunSummary,
  SuperiorFunctionRunsResponse
} from "@clawdbot/shared";

const maxStoredRuns = 24;
const runSummaries: SuperiorFunctionRunSummary[] = [];
const runEvents = new Map<string, SuperiorFunctionRunEvent[]>();

export function rememberFunctionRun(summary: SuperiorFunctionRunSummary, events: SuperiorFunctionRunEvent[]): void {
  const existingIndex = runSummaries.findIndex((item) => item.runId === summary.runId);

  if (existingIndex >= 0) {
    runSummaries.splice(existingIndex, 1);
  }

  runSummaries.unshift(summary);
  runEvents.set(summary.runId, events);

  while (runSummaries.length > maxStoredRuns) {
    const removed = runSummaries.pop();

    if (removed) {
      runEvents.delete(removed.runId);
    }
  }
}

export function readRecentFunctionRuns(): SuperiorFunctionRunsResponse {
  return {
    type: "superior-function-runs",
    items: [...runSummaries],
    createdAt: new Date().toISOString()
  };
}

export function readFunctionRunEvents(runId: string): SuperiorFunctionRunEventsResponse {
  return {
    type: "superior-function-run-events",
    runId,
    items: runEvents.get(runId) ?? [],
    createdAt: new Date().toISOString()
  };
}
