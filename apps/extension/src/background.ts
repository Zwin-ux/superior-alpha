import { renderBotIconSet } from "./icon";
import { loadBotIdentity } from "./botStorage";
import { BotIdentity } from "@clawdbot/shared";

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
});

chrome.runtime.onStartup.addListener(() => {
  void refreshActionIcon();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.clawdbotBotIdentity) {
    void refreshActionIcon();
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
