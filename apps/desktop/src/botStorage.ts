import { BotIdentity, DEFAULT_BOT_IDENTITY, updateBotIdentity } from "@clawdbot/shared";

const storageKey = "clawdbot.botIdentity.v1";

export function loadBotIdentity(): BotIdentity {
  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return DEFAULT_BOT_IDENTITY;
    }

    const parsed = JSON.parse(rawValue) as BotIdentity;

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

export function saveBotIdentity(bot: BotIdentity): void {
  window.localStorage.setItem(storageKey, JSON.stringify(bot));
}
