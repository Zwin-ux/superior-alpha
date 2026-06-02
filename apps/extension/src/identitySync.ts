import { BotIdentity } from "@clawdbot/shared";
import { fetchDaemonBotIdentity, loadStoredBotIdentity, normalizeBotIdentity, saveBotIdentity } from "./botStorage";
import { renderBotIconSet } from "./icon";

const identitySyncThrottleMs = 2500;
let lastIdentitySyncAt = 0;
let pendingIdentitySync: Promise<BotIdentity> | null = null;
let lastRenderedIdentitySignature = "";

export async function syncBotIdentityFromDaemon(options: { force?: boolean } = {}): Promise<BotIdentity> {
  if (!options.force && pendingIdentitySync) {
    return pendingIdentitySync;
  }

  const now = Date.now();

  if (!options.force && now - lastIdentitySyncAt < identitySyncThrottleMs) {
    return refreshActionIcon();
  }

  lastIdentitySyncAt = now;
  pendingIdentitySync = syncAndRefreshActionIcon().finally(() => {
    pendingIdentitySync = null;
  });

  return pendingIdentitySync;
}

export async function refreshActionIcon(bot?: Partial<BotIdentity> | null): Promise<BotIdentity> {
  const resolvedBot = bot ? normalizeBotIdentity(bot) : await loadStoredBotIdentity();

  await setActionIcon(resolvedBot);

  return resolvedBot;
}

export async function setActionIcon(bot: Partial<BotIdentity>): Promise<void> {
  const resolvedBot = normalizeBotIdentity(bot);
  const signature = getBotIdentitySignature(resolvedBot);

  if (signature === lastRenderedIdentitySignature) {
    return;
  }

  try {
    await chrome.action.setIcon({
      imageData: renderBotIconSet(resolvedBot)
    });
    lastRenderedIdentitySignature = signature;
  } catch {
    // Chrome can reject icon updates while the action surface or worker is waking.
  }
}

async function syncAndRefreshActionIcon(): Promise<BotIdentity> {
  const storedBot = await loadStoredBotIdentity();

  await setActionIcon(storedBot);

  const daemonBot = await fetchDaemonBotIdentity();

  if (daemonBot) {
    await saveBotIdentity(daemonBot);
    await setActionIcon(daemonBot);

    return daemonBot;
  }

  return storedBot;
}

export function getBotIdentitySignature(bot: Partial<BotIdentity> | null | undefined): string {
  const resolvedBot = normalizeBotIdentity(bot);

  return JSON.stringify({
    name: resolvedBot.name,
    body: resolvedBot.body,
    color: resolvedBot.color,
    eye: resolvedBot.eye,
    skills: resolvedBot.skills,
    updatedAt: resolvedBot.updatedAt ?? ""
  });
}
