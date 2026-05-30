import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  ArticleXrayResult,
  ExplainPageResult,
  RecentSkillResult,
  RecentSkillResultsResponse,
  RepoReaderResult,
  skillLabels
} from "@clawdbot/shared";
import { getSuperiorStateDirectory } from "./localPaths.js";

const recentResultsFileName = "recent-results.json";
const maxRecentResults = 8;

interface StoredRecentResults {
  items: RecentSkillResult[];
}

export function readRecentSkillResults(): RecentSkillResultsResponse {
  return {
    type: "recent-skill-results",
    items: readStoredRecentResults().items,
    createdAt: new Date().toISOString()
  };
}

export function rememberExplainPageResult(result: ExplainPageResult): void {
  rememberRecentSkillResult({
    type: "recent-skill-result",
    id: `recent_${result.requestId}`,
    requestId: result.requestId,
    skillId: "page-explainer",
    skillLabel: skillLabels["page-explainer"],
    source: result.source,
    summary: result.summary,
    detail: result.keyPoints[0] ?? "Page explained.",
    status: result.warnings.length > 0 ? "warning" : "ready",
    createdAt: result.createdAt
  });
}

export function rememberArticleXrayResult(result: ArticleXrayResult): void {
  rememberRecentSkillResult({
    type: "recent-skill-result",
    id: `recent_${result.requestId}`,
    requestId: result.requestId,
    skillId: "article-xray",
    skillLabel: skillLabels["article-xray"],
    source: result.source,
    summary: result.excerpt,
    detail: `${result.quality} / ${result.stats.wordCount} words / ${result.textSource}`,
    status: result.quality === "clean" && result.warnings.length === 0 ? "ready" : "warning",
    createdAt: result.createdAt
  });
}

export function rememberRepoReaderResult(result: RepoReaderResult): void {
  rememberRecentSkillResult({
    type: "recent-skill-result",
    id: `recent_${result.requestId}`,
    requestId: result.requestId,
    skillId: "repo-reader",
    skillLabel: skillLabels["repo-reader"],
    source: result.source,
    summary: result.summary,
    detail: `${result.playground.label} / ${result.environment.mode}`,
    status: result.risks.some((risk) => risk !== "No obvious first-pass risk.") ? "warning" : "ready",
    createdAt: result.createdAt
  });
}

function rememberRecentSkillResult(item: RecentSkillResult): void {
  try {
    const stored = readStoredRecentResults();
    const items = [item, ...stored.items.filter((existingItem) => existingItem.requestId !== item.requestId)].slice(
      0,
      maxRecentResults
    );

    writeStoredRecentResults({
      items
    });
  } catch {
    // Results should still return to the browser if history persistence fails.
  }
}

function readStoredRecentResults(): StoredRecentResults {
  const filePath = getRecentResultsFilePath();

  try {
    if (!existsSync(filePath)) {
      return {
        items: []
      };
    }

    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<StoredRecentResults>;

    return {
      items: Array.isArray(parsed.items) ? parsed.items.filter(isRecentSkillResult).slice(0, maxRecentResults) : []
    };
  } catch {
    return {
      items: []
    };
  }
}

function writeStoredRecentResults(results: StoredRecentResults): void {
  const filePath = getRecentResultsFilePath();

  mkdirSync(dirname(filePath), {
    recursive: true
  });
  writeFileSync(filePath, JSON.stringify(results, null, 2), "utf8");
}

function getRecentResultsFilePath(): string {
  return join(getSuperiorStateDirectory(), recentResultsFileName);
}

function isRecentSkillResult(item: unknown): item is RecentSkillResult {
  const candidate = item as Partial<RecentSkillResult>;

  return (
    candidate.type === "recent-skill-result" &&
    typeof candidate.id === "string" &&
    typeof candidate.requestId === "string" &&
    typeof candidate.skillId === "string" &&
    typeof candidate.skillLabel === "string" &&
    typeof candidate.summary === "string" &&
    typeof candidate.detail === "string" &&
    (candidate.status === "ready" || candidate.status === "warning") &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.source?.url === "string" &&
    typeof candidate.source?.title === "string"
  );
}
