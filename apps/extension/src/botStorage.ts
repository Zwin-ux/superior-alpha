import { BotIdentity, DEFAULT_BOT_IDENTITY, updateBotIdentity } from "@clawdbot/shared";

export const botIdentityStorageKey = "clawdbotBotIdentity";
const daemonUrl = "http://127.0.0.1:5317";

export async function loadBotIdentity(): Promise<BotIdentity> {
  const daemonBot = await fetchDaemonBotIdentity();

  if (daemonBot) {
    await saveBotIdentity(daemonBot);
    return daemonBot;
  }

  return loadStoredBotIdentity();
}

export async function loadStoredBotIdentity(): Promise<BotIdentity> {
  try {
    const chromeStorage = getChromeStorage();
    const stored = chromeStorage
      ? await chromeStorage.get(botIdentityStorageKey)
      : { [botIdentityStorageKey]: readBrowserPreviewStorage() };
    const parsed = stored[botIdentityStorageKey] as Partial<BotIdentity> | undefined;

    if (!parsed) {
      return DEFAULT_BOT_IDENTITY;
    }

    return normalizeBotIdentity(parsed);
  } catch {
    return DEFAULT_BOT_IDENTITY;
  }
}

export async function saveBotIdentity(bot: Partial<BotIdentity>): Promise<void> {
  const normalizedBot = normalizeBotIdentity(bot);
  const chromeStorage = getChromeStorage();

  if (chromeStorage) {
    await chromeStorage.set({
      [botIdentityStorageKey]: normalizedBot
    });
    return;
  }

  writeBrowserPreviewStorage(normalizedBot);
}

export async function fetchDaemonBotIdentity(): Promise<BotIdentity | null> {
  try {
    const response = await fetch(`${daemonUrl}/bot-identity`);

    if (!response.ok) {
      return null;
    }

    return normalizeBotIdentity((await response.json()) as Partial<BotIdentity>);
  } catch {
    return null;
  }
}

export function normalizeBotIdentity(bot: Partial<BotIdentity> | null | undefined): BotIdentity {
  if (!bot || typeof bot !== "object") {
    return DEFAULT_BOT_IDENTITY;
  }

  const changes: Partial<Pick<BotIdentity, "body" | "color" | "eye" | "name" | "skills">> = {};

  if (bot.body) {
    changes.body = bot.body;
  }

  if (bot.color) {
    changes.color = bot.color;
  }

  if (bot.eye) {
    changes.eye = bot.eye;
  }

  if (bot.name) {
    changes.name = bot.name;
  }

  if (Array.isArray(bot.skills)) {
    changes.skills = bot.skills;
  }

  return updateBotIdentity(
    {
      ...DEFAULT_BOT_IDENTITY,
      ...bot,
      browserLinkState: bot.browserLinkState ?? DEFAULT_BOT_IDENTITY.browserLinkState,
      rules: Array.isArray(bot.rules) ? bot.rules : DEFAULT_BOT_IDENTITY.rules,
      skills: Array.isArray(bot.skills) ? bot.skills : DEFAULT_BOT_IDENTITY.skills
    },
    changes
  );
}

function getChromeStorage(): typeof chrome.storage.local | null {
  return typeof chrome !== "undefined" && chrome.storage?.local ? chrome.storage.local : null;
}

function readBrowserPreviewStorage(): BotIdentity | undefined {
  try {
    const rawValue = globalThis.localStorage?.getItem(botIdentityStorageKey);

    return rawValue ? (JSON.parse(rawValue) as BotIdentity) : undefined;
  } catch {
    return undefined;
  }
}

function writeBrowserPreviewStorage(bot: BotIdentity): void {
  try {
    globalThis.localStorage?.setItem(botIdentityStorageKey, JSON.stringify(bot));
  } catch {
    // Browser preview storage is optional.
  }
}
