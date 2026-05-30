import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BotIdentity, DEFAULT_BOT_IDENTITY, updateBotIdentity } from "@clawdbot/shared";
import { getSuperiorStateDirectory } from "./localPaths.js";

export function readBotIdentity(): BotIdentity {
  const filePath = getIdentityFilePath();

  try {
    if (!existsSync(filePath)) {
      return DEFAULT_BOT_IDENTITY;
    }

    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as BotIdentity;

    return normalizeBotIdentity(parsed);
  } catch {
    return DEFAULT_BOT_IDENTITY;
  }
}

export function writeBotIdentity(bot: BotIdentity): BotIdentity {
  const normalized = normalizeBotIdentity(bot);
  const filePath = getIdentityFilePath();

  mkdirSync(dirname(filePath), {
    recursive: true
  });
  writeFileSync(filePath, JSON.stringify(normalized, null, 2), "utf8");

  return normalized;
}

function normalizeBotIdentity(bot: BotIdentity): BotIdentity {
  return updateBotIdentity(
    {
      ...DEFAULT_BOT_IDENTITY,
      ...bot,
      rules: Array.isArray(bot.rules) ? bot.rules : DEFAULT_BOT_IDENTITY.rules,
      skills: Array.isArray(bot.skills) ? bot.skills : DEFAULT_BOT_IDENTITY.skills,
      browserLinkState: bot.browserLinkState ?? DEFAULT_BOT_IDENTITY.browserLinkState
    },
    {
      body: bot.body,
      color: bot.color,
      eye: bot.eye,
      name: bot.name
    }
  );
}

function getIdentityFilePath(): string {
  return join(getSuperiorStateDirectory(), "bot-identity.json");
}
