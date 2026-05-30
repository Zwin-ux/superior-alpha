import { BotIdentity } from "@clawdbot/shared";
import { fetchDaemonBotIdentity, loadStoredBotIdentity, normalizeBotIdentity, saveBotIdentity } from "./botStorage";
import { renderBotIconSet } from "./icon";

const identitySyncThrottleMs = 2500;
let lastIdentitySyncAt = 0;
let pendingIdentitySync: Promise<BotIdentity> | null = null;

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
  try {
    await chrome.action.setIcon({
      imageData: renderBotIconSet(normalizeBotIdentity(bot))
    });
  } catch {
    // Chrome can reject icon updates while the action surface or worker is waking.
  }
}

async function syncAndRefreshActionIcon(): Promise<BotIdentity> {
  const daemonBot = await fetchDaemonBotIdentity();
  const bot = daemonBot ?? (await loadStoredBotIdentity());

  if (daemonBot) {
    await saveBotIdentity(daemonBot);
  }

  await setActionIcon(bot);

  return bot;
}
