import {
  ArticleXrayError,
  ArticleXrayResult,
  ExplainPageError,
  ExplainPageResult,
  SuperiorFunctionError,
  SuperiorFunctionId,
  SuperiorFunctionRunResult,
  createSuperiorFunctionRunRequest
} from "@clawdbot/shared";

const daemonUrl = "http://127.0.0.1:5317";

export type BrowserSkillResult = ExplainPageResult | ArticleXrayResult;
type BrowserSkillError = ExplainPageError | ArticleXrayError;

export async function runBrowserSkill<TResult extends BrowserSkillResult, TLegacyError extends BrowserSkillError>(
  options: {
    functionId: SuperiorFunctionId;
    input: unknown;
    pairingToken: string;
    legacyPath: "/explain" | "/skills/article-xray";
    isExpectedResult: (payload: unknown) => payload is TResult;
    isLegacyError: (payload: unknown) => payload is TLegacyError;
  }
): Promise<TResult> {
  const functionResponse = await fetch(`${daemonUrl}/functions/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Clawdbot-Pairing-Token": options.pairingToken
    },
    body: JSON.stringify(
      createSuperiorFunctionRunRequest({
        functionId: options.functionId,
        input: options.input
      })
    )
  });
  const functionPayload = await readJson(functionResponse);

  if (isSuperiorFunctionError(functionPayload)) {
    throwFunctionError(functionPayload);
  }

  if (functionResponse.ok && isSuperiorFunctionRunResult(functionPayload)) {
    if (options.isExpectedResult(functionPayload.result)) {
      return functionPayload.result;
    }

    throw new Error("SUPERIOR returned the wrong skill result.");
  }

  if (functionResponse.status !== 404) {
    throw new Error("SUPERIOR returned an unexpected function response.");
  }

  return runLegacyBrowserSkill(options);
}

export function isExplainPageResult(payload: unknown): payload is ExplainPageResult {
  return (payload as Partial<ExplainPageResult>)?.type === "explain-page-result";
}

export function isExplainPageError(payload: unknown): payload is ExplainPageError {
  return (payload as Partial<ExplainPageError>)?.type === "explain-page-error";
}

export function isArticleXrayResult(payload: unknown): payload is ArticleXrayResult {
  return (payload as Partial<ArticleXrayResult>)?.type === "article-xray-result";
}

export function isArticleXrayError(payload: unknown): payload is ArticleXrayError {
  return (payload as Partial<ArticleXrayError>)?.type === "article-xray-error";
}

export class PairingStaleError extends Error {}

async function runLegacyBrowserSkill<TResult extends BrowserSkillResult, TLegacyError extends BrowserSkillError>(
  options: {
    input: unknown;
    pairingToken: string;
    legacyPath: "/explain" | "/skills/article-xray";
    isExpectedResult: (payload: unknown) => payload is TResult;
    isLegacyError: (payload: unknown) => payload is TLegacyError;
  }
): Promise<TResult> {
  const legacyResponse = await fetch(`${daemonUrl}${options.legacyPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Clawdbot-Pairing-Token": options.pairingToken
    },
    body: JSON.stringify(options.input)
  });
  const legacyPayload = await readJson(legacyResponse);

  if (options.isLegacyError(legacyPayload)) {
    if (legacyPayload.code === "unauthorized") {
      throw new PairingStaleError(legacyPayload.message);
    }

    throw new Error(legacyPayload.message);
  }

  if (!legacyResponse.ok || !options.isExpectedResult(legacyPayload)) {
    throw new Error("SUPERIOR returned an unexpected legacy response.");
  }

  return legacyPayload;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function throwFunctionError(error: SuperiorFunctionError): never {
  if (error.code === "unauthorized") {
    throw new PairingStaleError(error.message);
  }

  throw new Error(error.message);
}

function isSuperiorFunctionError(payload: unknown): payload is SuperiorFunctionError {
  return (payload as Partial<SuperiorFunctionError>)?.type === "superior-function-error";
}

function isSuperiorFunctionRunResult(payload: unknown): payload is SuperiorFunctionRunResult {
  return (payload as Partial<SuperiorFunctionRunResult>)?.type === "superior-function-run-result";
}
