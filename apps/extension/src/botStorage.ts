import { BotIdentity, DEFAULT_BOT_IDENTITY, updateBotIdentity } from "@clawdbot/shared";

const storageKey = "clawdbotBotIdentity";
const daemonUrl = "http://127.0.0.1:5317";

export async function loadBotIdentity(): Promise<BotIdentity> {
  const daemonBot = await fetchDaemonBotIdentity();

  if (daemonBot) {
    await saveBotIdentity(daemonBot);
    return daemonBot;
  }

  try {
    const chromeStorage = getChromeStorage();
    const stored = chromeStorage
      ? await chromeStorage.get(storageKey)
      : { [storageKey]: readBrowserPreviewStorage() };
    const parsed = stored[storageKey] as BotIdentity | undefined;

    if (!parsed) {
      return DEFAULT_BOT_IDENTITY;
    }

    return updateBotIdentity(
      {
        ...DEFAULT_BOT_IDENTITY,
        ...parsed,
        browserLinkState: parsed.browserLinkState ?? DEFAULT_BOT_IDENTITY.browserLinkState,
        rules: Array.isArray(parsed.rules) ? parsed.rules : DEFAULT_BOT_IDENTITY.rules,
        skills: Array.isArray(parsed.skills) ? parsed.skills : DEFAULT_BOT_IDENTITY.skills
      },
      {
        body: parsed.body,
        color: parsed.color,
        eye: parsed.eye,
        name: parsed.name
      }
    );
  } catch {
    return DEFAULT_BOT_IDENTITY;
  }
}

export async function saveBotIdentity(bot: BotIdentity): Promise<void> {
  const chromeStorage = getChromeStorage();

  if (chromeStorage) {
    await chromeStorage.set({
      [storageKey]: bot
    });
    return;
  }

  writeBrowserPreviewStorage(bot);
}

async function fetchDaemonBotIdentity(): Promise<BotIdentity | null> {
  try {
    const response = await fetch(`${daemonUrl}/bot-identity`);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as BotIdentity;
  } catch {
    return null;
  }
}

function getChromeStorage(): typeof chrome.storage.local | null {
  return typeof chrome !== "undefined" && chrome.storage?.local ? chrome.storage.local : null;
}

function readBrowserPreviewStorage(): BotIdentity | undefined {
  try {
    const rawValue = globalThis.localStorage?.getItem(storageKey);

    return rawValue ? (JSON.parse(rawValue) as BotIdentity) : undefined;
  } catch {
    return undefined;
  }
}

function writeBrowserPreviewStorage(bot: BotIdentity): void {
  try {
    globalThis.localStorage?.setItem(storageKey, JSON.stringify(bot));
  } catch {
    // Browser preview storage is optional.
  }
}
