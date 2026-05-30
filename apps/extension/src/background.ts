import { botIdentityStorageKey } from "./botStorage";
import {
  ArticleXrayError,
  ArticleXrayResult,
  BotIdentity,
  ExplainPageError,
  ExplainPageResult,
  createArticleXrayRequest,
  createExplainPageRequest,
  createSuperiorBrowserActivePageReport
} from "@clawdbot/shared";
import { capturePageFromTab, clearPairingToken, readPairingToken } from "./browser";
import {
  PairingStaleError,
  isArticleXrayError,
  isArticleXrayResult,
  isExplainPageError,
  isExplainPageResult,
  runBrowserSkill
} from "./functionClient";
import { refreshActionIcon, syncBotIdentityFromDaemon } from "./identitySync";

const daemonUrl = "http://127.0.0.1:5317";
let lastActivePageSignature = "";
let lastActivePageReportedAt = 0;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "clawdbot-explain",
    title: "Explain with SUPERIOR",
    contexts: ["page", "selection"]
  });
  chrome.contextMenus.create({
    id: "clawdbot-xray",
    title: "Article X-Ray with SUPERIOR",
    contexts: ["page", "selection"]
  });

  void syncBotIdentityFromDaemon({ force: true });
  void reportActiveTabSoon();
});

chrome.runtime.onStartup.addListener(() => {
  void syncBotIdentityFromDaemon({ force: true });
  void reportActiveTabSoon();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[botIdentityStorageKey]) {
    void refreshActionIcon(changes[botIdentityStorageKey].newValue as Partial<BotIdentity> | undefined);
  }

  if (areaName === "local" && changes.clawdbotPairingToken) {
    void syncBotIdentityFromDaemon();
    void reportActiveTabSoon();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void handleContextMenuClick(info, tab);
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  const candidate = message as { type?: string; bot?: BotIdentity };

  if (candidate.type === "superior-set-action-icon" && candidate.bot) {
    void refreshActionIcon(candidate.bot);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  void syncBotIdentityFromDaemon();
  void reportTabById(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    void reportTabById(tabId);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    void syncBotIdentityFromDaemon();
    void reportActiveTabSoon();
  }
});

async function reportActiveTabSoon(): Promise<void> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (tab?.id) {
    await reportTabById(tab.id);
  }
}

async function reportTabById(tabId: number): Promise<void> {
  try {
    const [token, tab] = await Promise.all([readPairingToken(), chrome.tabs.get(tabId)]);

    if (!token || !isReportableTab(tab)) {
      return;
    }

    const url = tab.url ?? "";
    const title = tab.title || url;
    const signature = `${tab.id ?? ""}|${url}|${title}`;
    const now = Date.now();

    if (signature === lastActivePageSignature && now - lastActivePageReportedAt < 2000) {
      return;
    }

    lastActivePageSignature = signature;
    lastActivePageReportedAt = now;

    const request = createSuperiorBrowserActivePageReport({
      pairingToken: token,
      page: {
        url,
        title,
        ...(typeof tab.id === "number" ? { tabId: tab.id } : {}),
        ...(typeof tab.windowId === "number" ? { windowId: tab.windowId } : {}),
        capturedAt: new Date().toISOString()
      }
    });

    await fetch(`${daemonUrl}/browser-runtime/active-page`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Clawdbot-Pairing-Token": token
      },
      body: JSON.stringify(request)
    }).catch(() => undefined);
  } catch {
    // Active-page proof is best effort; skill calls still report their own result.
  }
}

async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
  if (info.menuItemId !== "clawdbot-explain" && info.menuItemId !== "clawdbot-xray") {
    return;
  }

  if (!tab?.id || !isReportableTab(tab)) {
    await showActionBadge("!", "bad");
    return;
  }

  await showActionBadge("...", "busy");

  try {
    if (info.menuItemId === "clawdbot-explain") {
      await runContextMenuExplain(tab.id, info.selectionText);
    } else {
      await runContextMenuXray(tab.id, info.selectionText);
    }

    await showActionBadge("OK", "ready");
    await reportTabById(tab.id);
  } catch (error) {
    if (error instanceof PairingStaleError) {
      await clearPairingToken().catch(() => undefined);
      await showActionBadge("PAIR", "bad");
      return;
    }

    await showActionBadge("!", "bad");
  }
}

async function runContextMenuExplain(tabId: number, selectionText: string | undefined): Promise<ExplainPageResult> {
  const [pairingToken, bot, page] = await readContextMenuInputs(tabId, selectionText);
  const request = createExplainPageRequest({
    pairingToken,
    bot,
    page
  });

  return runBrowserSkill<ExplainPageResult, ExplainPageError>({
    functionId: "page-explainer",
    input: request,
    pairingToken,
    legacyPath: "/explain",
    isExpectedResult: isExplainPageResult,
    isLegacyError: isExplainPageError
  });
}

async function runContextMenuXray(tabId: number, selectionText: string | undefined): Promise<ArticleXrayResult> {
  const [pairingToken, bot, page] = await readContextMenuInputs(tabId, selectionText);
  const request = createArticleXrayRequest({
    pairingToken,
    bot,
    page
  });

  return runBrowserSkill<ArticleXrayResult, ArticleXrayError>({
    functionId: "article-xray",
    input: request,
    pairingToken,
    legacyPath: "/skills/article-xray",
    isExpectedResult: isArticleXrayResult,
    isLegacyError: isArticleXrayError
  });
}

async function readContextMenuInputs(
  tabId: number,
  selectionText: string | undefined
): Promise<[string, BotIdentity, Awaited<ReturnType<typeof capturePageFromTab>>]> {
  const [pairingToken, bot, page] = await Promise.all([
    readRequiredPairingToken(),
    syncBotIdentityFromDaemon(),
    capturePageFromTab(tabId, selectionText)
  ]);

  return [pairingToken, bot, page];
}

async function readRequiredPairingToken(): Promise<string> {
  const token = await readPairingToken();

  if (!token) {
    throw new PairingStaleError("Pair SUPERIOR before using browser skills.");
  }

  return token;
}

async function showActionBadge(text: string, tone: "busy" | "ready" | "bad"): Promise<void> {
  const color = tone === "ready" ? "#566d46" : tone === "busy" ? "#9a7331" : "#823f31";

  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });

  if (tone !== "busy") {
    setTimeout(() => {
      void chrome.action.setBadgeText({ text: "" });
    }, 2400);
  }
}

function isReportableTab(tab: chrome.tabs.Tab): boolean {
  const url = tab.url ?? "";

  if (!url || url.includes("/browser-session/")) {
    return false;
  }

  return ["http://", "https://", "file://"].some((prefix) => url.startsWith(prefix));
}
