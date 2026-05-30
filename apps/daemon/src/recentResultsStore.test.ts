import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ArticleXrayResult, ExplainPageResult } from "@clawdbot/shared";
import {
  readRecentSkillResults,
  rememberArticleXrayResult,
  rememberExplainPageResult
} from "./recentResultsStore.js";

const stateDirectory = join(process.cwd(), ".test-recent-results-state");

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

describe("recent results store", () => {
  it("records Article X-Ray and Page Explainer results for the Workshop", () => {
    rememberArticleXrayResult(createArticleResult("xray_test"));
    rememberExplainPageResult(createExplainResult("explain_test"));

    const recent = readRecentSkillResults();

    expect(recent.type).toBe("recent-skill-results");
    expect(recent.items).toHaveLength(2);
    expect(recent.items[0]?.skillId).toBe("page-explainer");
    expect(recent.items[0]?.summary).toBe("This page explains clay utility bots.");
    expect(recent.items[1]?.skillId).toBe("article-xray");
    expect(recent.items[1]?.detail).toBe("clean / 420 words / readable-blocks");
  });

  it("keeps only the latest eight unique results", () => {
    for (let index = 0; index < 10; index += 1) {
      rememberArticleXrayResult(createArticleResult(`xray_${index}`));
    }

    rememberArticleXrayResult(createArticleResult("xray_9"));

    const recent = readRecentSkillResults();

    expect(recent.items).toHaveLength(8);
    expect(recent.items[0]?.requestId).toBe("xray_9");
    expect(recent.items.filter((item) => item.requestId === "xray_9")).toHaveLength(1);
    expect(recent.items.at(-1)?.requestId).toBe("xray_2");
  });
});

function createArticleResult(requestId: string): ArticleXrayResult {
  return {
    type: "article-xray-result",
    requestId,
    source: {
      url: "https://example.com/article",
      title: "Clay Utility Bots"
    },
    textSource: "readable-blocks",
    quality: "clean",
    headline: "Clay Utility Bots",
    excerpt: "A compact excerpt from the article.",
    cleanText: "A compact excerpt from the article.",
    blocks: [],
    stats: {
      inputCharacters: 900,
      outputCharacters: 600,
      wordCount: 420,
      paragraphCount: 4,
      headingCount: 1,
      coverageRatio: 0.67
    },
    warnings: [],
    createdAt: "2026-05-29T00:00:00.000Z"
  };
}

function createExplainResult(requestId: string): ExplainPageResult {
  return {
    type: "explain-page-result",
    requestId,
    summary: "This page explains clay utility bots.",
    keyPoints: ["The bot keeps local state visible."],
    usefulActions: ["Pair the browser."],
    warnings: [],
    source: {
      url: "https://example.com/explain",
      title: "Explained Page"
    },
    model: "gpt-4.1-mini",
    createdAt: "2026-05-29T00:00:01.000Z"
  };
}
