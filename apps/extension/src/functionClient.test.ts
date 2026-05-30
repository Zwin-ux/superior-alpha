import { afterEach, describe, expect, it, vi } from "vitest";
import { runBrowserSkill, isArticleXrayError, isArticleXrayResult, PairingStaleError } from "./functionClient";

const articleResult = {
  type: "article-xray-result",
  requestId: "xray_test",
  source: {
    url: "https://example.com",
    title: "Example"
  },
  textSource: "selection",
  quality: "clean",
  headline: "Example",
  excerpt: "Readable result.",
  cleanText: "Readable result.",
  blocks: [],
  stats: {
    inputCharacters: 16,
    outputCharacters: 16,
    wordCount: 2,
    paragraphCount: 1,
    headingCount: 0,
    coverageRatio: 1
  },
  warnings: [],
  createdAt: new Date(0).toISOString()
} as const;

describe("extension function client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns browser skill output from the function runner", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        type: "superior-function-run-result",
        requestId: "function_test",
        runId: "run_test",
        functionId: "article-xray",
        status: "completed",
        result: articleResult,
        events: [],
        botReaction: {
          type: "superior-bot-reaction",
          state: "success",
          pulseKey: "run_test:article-xray:success",
          label: "X-Ray clicked",
          slot: "eye",
          createdAt: new Date(0).toISOString()
        },
        createdAt: new Date(0).toISOString()
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await runBrowserSkill({
      functionId: "article-xray",
      input: { type: "article-xray" },
      pairingToken: "pair_test",
      legacyPath: "/skills/article-xray",
      isExpectedResult: isArticleXrayResult,
      isLegacyError: isArticleXrayError
    });

    expect(result).toEqual(articleResult);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(readFetchCalls(fetchMock)[0]?.[0])).toContain("/functions/run");
  });

  it("falls back to the legacy endpoint only when the runner route is missing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(404, { type: "explain-page-error", code: "bad_request", message: "Unknown route." }))
      .mockResolvedValueOnce(jsonResponse(200, articleResult));

    vi.stubGlobal("fetch", fetchMock);

    const result = await runBrowserSkill({
      functionId: "article-xray",
      input: { type: "article-xray" },
      pairingToken: "pair_test",
      legacyPath: "/skills/article-xray",
      isExpectedResult: isArticleXrayResult,
      isLegacyError: isArticleXrayError
    });

    expect(result).toEqual(articleResult);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(readFetchCalls(fetchMock)[1]?.[0])).toContain("/skills/article-xray");
  });

  it("turns unauthorized function errors into stale pairing recovery", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(401, {
          type: "superior-function-error",
          code: "unauthorized",
          message: "Pairing stale.",
          createdAt: new Date(0).toISOString()
        })
      )
    );

    await expect(
      runBrowserSkill({
        functionId: "article-xray",
        input: { type: "article-xray" },
        pairingToken: "pair_test",
        legacyPath: "/skills/article-xray",
        isExpectedResult: isArticleXrayResult,
        isLegacyError: isArticleXrayError
      })
    ).rejects.toBeInstanceOf(PairingStaleError);
  });
});

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function readFetchCalls(fetchMock: ReturnType<typeof vi.fn>): Array<[unknown, unknown?]> {
  return fetchMock.mock.calls as Array<[unknown, unknown?]>;
}
