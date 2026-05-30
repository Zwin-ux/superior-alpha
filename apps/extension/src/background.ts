import { renderBotIconSet } from "./icon";
import { loadBotIdentity } from "./botStorage";
import { BotIdentity, createSuperiorBrowserActivePageReport } from "@clawdbot/shared";

const daemonUrl = "http://127.0.0.1:5317";
const pairingStorageKey = "clawdbotPairingToken";
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

  void refreshActionIcon();
  void reportActiveTabSoon();
});

chrome.runtime.onStartup.addListener(() => {
  void refreshActionIcon();
  void reportActiveTabSoon();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.clawdbotBotIdentity) {
    void refreshActionIcon();
  }

  if (areaName === "local" && changes.clawdbotPairingToken) {
    void reportActiveTabSoon();
  }
});

chrome.contextMenus.onClicked.addListener(() => {
  if (chrome.action.openPopup) {
    void chrome.action.openPopup();
  }
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  const candidate = message as { type?: string; bot?: BotIdentity };

  if (candidate.type === "superior-set-action-icon" && candidate.bot) {
    void setActionIcon(candidate.bot);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  void reportTabById(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    void reportTabById(tabId);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    void reportActiveTabSoon();
  }
});

async function refreshActionIcon(): Promise<void> {
  try {
    const bot = await loadBotIdentity();

    await setActionIcon(bot);
  } catch {
    // Chrome can reject icon updates before the extension action is ready.
  }
}

async function setActionIcon(bot: BotIdentity): Promise<void> {
  try {
    await chrome.action.setIcon({
      imageData: renderBotIconSet(bot)
    });
  } catch {
    // Chrome can reject icon updates before the extension action is ready.
  }
}

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

async function readPairingToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(pairingStorageKey);
  const value = result[pairingStorageKey];

  return typeof value === "string" ? value : null;
}

function isReportableTab(tab: chrome.tabs.Tab): boolean {
  const url = tab.url ?? "";

  if (!url || url.includes("/browser-session/")) {
    return false;
  }

  return ["http://", "https://", "file://"].some((prefix) => url.startsWith(prefix));
}
