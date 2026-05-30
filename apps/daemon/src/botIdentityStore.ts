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
  const now = new Date().toISOString();
  const normalized = normalizeBotIdentity({
    ...bot,
    createdAt: bot.createdAt ?? now,
    updatedAt: now
  });
  const filePath = getIdentityFilePath();

  mkdirSync(dirname(filePath), {
    recursive: true
  });
  writeFileSync(filePath, JSON.stringify(normalized, null, 2), "utf8");

  return normalized;
}

export function hasSavedBotIdentity(): boolean {
  return existsSync(getIdentityFilePath());
}

function normalizeBotIdentity(bot: BotIdentity): BotIdentity {
  const createdAt = bot.createdAt;
  const updatedAt = bot.updatedAt;
  const starterPresetId = bot.starterPresetId;
  const normalized = updateBotIdentity(
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

  return {
    ...normalized,
    ...(starterPresetId ? { starterPresetId } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {})
  };
}

function getIdentityFilePath(): string {
  return join(getSuperiorStateDirectory(), "bot-identity.json");
}
