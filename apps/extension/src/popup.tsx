import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArticleXrayError,
  ArticleXrayResult,
  BrowserPairingCompleteResult,
  BrowserPairingError,
  DEFAULT_BOT_IDENTITY,
  ExplainPageError,
  ExplainPageResult,
  createArticleXrayRequest,
  createBrowserPairingCompleteRequest,
  createExplainPageRequest,
  makeBotCssVars,
  skillLabels
} from "@clawdbot/shared";
import { captureActivePage, clearPairingToken, getPairingToken, readPairingToken, savePairingToken } from "./browser";
import { botIdentityStorageKey, normalizeBotIdentity } from "./botStorage";
import { updateFavicon } from "./favicon";
import {
  PairingStaleError,
  isArticleXrayError,
  isArticleXrayResult,
  isExplainPageError,
  isExplainPageResult,
  runBrowserSkill
} from "./functionClient";
import { refreshActionIcon, syncBotIdentityFromDaemon } from "./identitySync";
import "./popup.css";

const daemonUrl = "http://127.0.0.1:5317";
type BrowserStatus = "unpaired" | "pairing" | "paired" | "stale" | "offline";

function Popup(): React.ReactElement {
  const [bot, setBot] = useState(DEFAULT_BOT_IDENTITY);
  const botStyle = useMemo(() => makeBotCssVars(bot), [bot]);
  const [status, setStatus] = useState<"checking" | "ready" | "missing-config" | "offline">("checking");
  const [result, setResult] = useState<ExplainPageResult | ArticleXrayResult | null>(null);
  const [message, setMessage] = useState("Checking local daemon...");
  const [busySkill, setBusySkill] = useState<"explain" | "xray" | null>(null);
  const [browserStatus, setBrowserStatus] = useState<BrowserStatus>("offline");
  const [pairingTokenInput, setPairingTokenInput] = useState("");
  const [pairingBusy, setPairingBusy] = useState(false);

  useEffect(() => {
    void checkHealth();
  }, []);

  useEffect(() => {
    let disposed = false;

    async function refreshBot(): Promise<void> {
      const nextBot = await syncBotIdentityFromDaemon({ force: true });

      if (!disposed) {
        setBot(nextBot);
        updateFavicon(nextBot);
      }
    }

    void refreshBot();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
      return;
    }

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string): void => {
      if (areaName !== "local" || !changes[botIdentityStorageKey]?.newValue) {
        return;
      }

      const nextBot = normalizeBotIdentity(changes[botIdentityStorageKey].newValue as Partial<typeof DEFAULT_BOT_IDENTITY>);

      setBot(nextBot);
      updateFavicon(nextBot);
      void refreshActionIcon(nextBot);
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  async function checkHealth(): Promise<void> {
    try {
      const response = await fetch(`${daemonUrl}/health`);
      const health = (await response.json()) as {
        openaiConfigured?: boolean;
        browserLinkState?: { status?: "unpaired" | "pairing" | "paired" | "offline" };
      };
      const localPairingToken = await readPairingToken();
      const nextBrowserStatus = health.browserLinkState?.status ?? (localPairingToken ? "paired" : "unpaired");

      setBrowserStatus(nextBrowserStatus);
      setStatus(health.openaiConfigured ? "ready" : "missing-config");

      if (nextBrowserStatus !== "paired") {
        setMessage("Pair from SUPERIOR first.");
      } else {
        setMessage(health.openaiConfigured ? "Ready on this machine." : "OpenAI key missing in .env.local.");
      }
    } catch {
      setStatus("offline");
      setBrowserStatus("offline");
      setMessage("Start SUPERIOR to use Page Explainer.");
    }
  }

  async function completePairing(): Promise<void> {
    const pairingToken = pairingTokenInput.trim();

    if (!pairingToken) {
      setMessage("Paste the token from SUPERIOR.");
      return;
    }

    setPairingBusy(true);

    try {
      const response = await fetch(`${daemonUrl}/browser-link/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          createBrowserPairingCompleteRequest({
            pairingToken,
            ...(typeof chrome !== "undefined" && chrome.runtime?.id ? { extensionId: chrome.runtime.id } : {})
          })
        )
      });
      const payload = (await response.json()) as BrowserPairingCompleteResult | BrowserPairingError;

      if (payload.type === "browser-pairing-error") {
        throw new Error(payload.message);
      }

      if (!response.ok) {
        throw new Error("SUPERIOR rejected the pairing token.");
      }

      await savePairingToken(pairingToken);
      const nextBot = await syncBotIdentityFromDaemon({ force: true });

      setBot(nextBot);
      updateFavicon(nextBot);
      setPairingTokenInput("");
      setBrowserStatus(payload.browserLinkState.status);
      setMessage("Browser paired.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Browser pairing failed.");
    } finally {
      setPairingBusy(false);
    }
  }

  async function resetPairing(): Promise<void> {
    setPairingBusy(true);

    try {
      const pairingToken = await readPairingToken();
      const resetRequestInit: RequestInit = {
        method: "POST"
      };

      if (pairingToken) {
        resetRequestInit.headers = {
          "X-Clawdbot-Pairing-Token": pairingToken
        };
      }

      await clearPairingToken();
      await fetch(`${daemonUrl}/browser-link/reset`, resetRequestInit).catch(() => undefined);
      setResult(null);
      setPairingTokenInput("");
      setBrowserStatus("unpaired");
      setMessage("Pair from SUPERIOR first.");
    } finally {
      setPairingBusy(false);
    }
  }

  async function markPairingStale(messageText: string): Promise<void> {
    await clearPairingToken().catch(() => undefined);
    setResult(null);
    setBrowserStatus("stale");
    setMessage(messageText);
  }

  async function explainCurrentPage(): Promise<void> {
    setBusySkill("explain");
    setResult(null);
    setMessage("Reading this page...");

    try {
      const [page, pairingToken] = await Promise.all([captureActivePage(), getPairingToken()]);
      const request = createExplainPageRequest({
        pairingToken,
        bot,
        page
      });

      setMessage("Asking SUPERIOR...");

      const payload = await runBrowserSkill<ExplainPageResult, ExplainPageError>({
        functionId: "page-explainer",
        input: request,
        pairingToken,
        legacyPath: "/explain",
        isExpectedResult: isExplainPageResult,
        isLegacyError: isExplainPageError
      });

      setResult(payload);
      setStatus("ready");
      setMessage("Done.");
    } catch (error) {
      if (error instanceof PairingStaleError) {
        await markPairingStale(error.message);
        return;
      }

      setMessage(error instanceof Error ? error.message : "SUPERIOR could not explain this page.");
    } finally {
      setBusySkill(null);
    }
  }

  async function xrayCurrentPage(): Promise<void> {
    setBusySkill("xray");
    setResult(null);
    setMessage("Reading article blocks...");

    try {
      const [page, pairingToken] = await Promise.all([captureActivePage(), getPairingToken()]);
      const request = createArticleXrayRequest({
        pairingToken,
        bot,
        page
      });

      setMessage("Cleaning this page...");

      const payload = await runBrowserSkill<ArticleXrayResult, ArticleXrayError>({
        functionId: "article-xray",
        input: request,
        pairingToken,
        legacyPath: "/skills/article-xray",
        isExpectedResult: isArticleXrayResult,
        isLegacyError: isArticleXrayError
      });

      setResult(payload);
      setStatus("ready");
      setMessage("Article X-Ray ready.");
    } catch (error) {
      if (error instanceof PairingStaleError) {
        await markPairingStale(error.message);
        return;
      }

      setMessage(error instanceof Error ? error.message : "SUPERIOR could not X-Ray this page.");
    } finally {
      setBusySkill(null);
    }
  }

  return (
    <main className="popup-shell">
      <section className="bot-card" style={botStyle}>
        <div className={`tiny-bot tiny-bot-${bot.body} tiny-eye-${bot.eye}`} aria-hidden="true">
          <span className="antenna antenna-left" />
          <span className="antenna antenna-right" />
          <span className="bot-eye eye-left" />
          <span className="bot-eye eye-right" />
          <span className="gear-chip" />
          {bot.skills.map((skill) => (
            <span key={skill} className={`tiny-skill-piece tiny-skill-${skill}`} title={skillLabels[skill]} />
          ))}
        </div>
        <div>
          <h1>{bot.name}</h1>
          <p>{message}</p>
        </div>
      </section>

      {browserStatus !== "paired" ? (
        <section className={`pair-panel pair-panel-${browserStatus}`} aria-label="Browser pairing">
          <input
            aria-label="Pairing token"
            value={pairingTokenInput}
            onChange={(event) => setPairingTokenInput(event.currentTarget.value)}
            placeholder="Pairing token"
          />
          <button className="clay-action" type="button" onClick={() => void completePairing()} disabled={pairingBusy}>
            {pairingBusy ? "Pairing..." : "Pair"}
          </button>
          <button className="clay-action clay-action-quiet" type="button" onClick={() => void resetPairing()} disabled={pairingBusy}>
            Reset
          </button>
        </section>
      ) : null}

      {browserStatus === "paired" ? (
        <button className="clay-action clay-action-quiet" type="button" onClick={() => void resetPairing()} disabled={pairingBusy}>
          Reset Pairing
        </button>
      ) : null}

      <div className="action-grid">
        <button
          className="clay-action"
          type="button"
          onClick={explainCurrentPage}
          disabled={busySkill !== null || browserStatus !== "paired"}
        >
          {busySkill === "explain" ? "Explaining..." : "Explain Page"}
        </button>
        <button
          className="clay-action clay-action-secondary"
          type="button"
          onClick={xrayCurrentPage}
          disabled={busySkill !== null || browserStatus !== "paired"}
        >
          {busySkill === "xray" ? "X-Raying..." : "Article X-Ray"}
        </button>
      </div>

      <section className={`status-pill status-${status}`}>{status.replace("-", " ")}</section>

      {result?.type === "explain-page-result" ? (
        <article className="result-panel">
          <h2>{result.source.title || "This page"}</h2>
          <p>{result.summary}</p>
          <ul>
            {result.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      ) : null}

      {result?.type === "article-xray-result" ? (
        <article className="result-panel">
          <h2>{result.headline}</h2>
          <p>{result.excerpt}</p>
          <div className="xray-stats">
            <span>{result.quality}</span>
            <span>{result.stats.wordCount} words</span>
            <span>{result.textSource}</span>
          </div>
          <pre className="clean-text-preview">{result.cleanText}</pre>
        </article>
      ) : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
