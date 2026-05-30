interface BotIdentityForStorage {
  name: string;
  body: string;
  color: string;
  eye: string;
  skills: string[];
}

interface SuperiorSessionData {
  sessionId: string;
  sessionToken: string;
}

interface SuperiorBrowserAttachResult {
  type: "superior-browser-attach-result";
  pairingToken: string;
  bot: BotIdentityForStorage;
}

interface SuperiorBrowserError {
  type: "superior-browser-error";
  message: string;
}

const pairingStorageKey = "clawdbotPairingToken";
const botStorageKey = "clawdbotBotIdentity";

void attachControlledProfile();

async function attachControlledProfile(): Promise<void> {
  const statusElement = document.getElementById("superior-attach-status");

  try {
    const sessionData = readSessionData();

    if (!sessionData) {
      writeStatus(statusElement, (await readStoredValue(pairingStorageKey)) ? "paired" : "missing token");
      return;
    }

    const response = await fetch(`/browser-session/${encodeURIComponent(sessionData.sessionId)}/attach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "superior-browser-attach",
        requestId: createLocalId("browser_attach"),
        sessionToken: sessionData.sessionToken,
        ...(typeof chrome !== "undefined" && chrome.runtime?.id ? { extensionId: chrome.runtime.id } : {}),
        createdAt: new Date().toISOString()
      })
    });
    const payload = (await response.json()) as SuperiorBrowserAttachResult | SuperiorBrowserError;

    if (payload.type === "superior-browser-error") {
      throw new Error(payload.message);
    }

    if (!response.ok) {
      throw new Error("SUPERIOR Browser attach failed.");
    }

    await Promise.all([writeStoredValue(pairingStorageKey, payload.pairingToken), writeStoredValue(botStorageKey, payload.bot)]);
    await updateActionIcon(payload.bot);
    writeStatus(statusElement, "paired");
  } catch (error) {
    writeStatus(statusElement, error instanceof Error ? error.message : "attach failed");
  }
}

function readSessionData(): SuperiorSessionData | null {
  const element = document.getElementById("superior-session-data");

  if (!element?.textContent) {
    return null;
  }

  try {
    const parsed = JSON.parse(element.textContent) as Partial<SuperiorSessionData>;

    if (typeof parsed.sessionId === "string" && typeof parsed.sessionToken === "string") {
      return {
        sessionId: parsed.sessionId,
        sessionToken: parsed.sessionToken
      };
    }
  } catch {
    return null;
  }

  return null;
}

async function readStoredValue(key: string): Promise<unknown> {
  const chromeStorage = getChromeStorage();

  if (chromeStorage) {
    const value = await chromeStorage.get(key);

    return value[key];
  }

  try {
    const rawValue = globalThis.localStorage?.getItem(key);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  } catch {
    return null;
  }
}

async function writeStoredValue(key: string, value: unknown): Promise<void> {
  const chromeStorage = getChromeStorage();

  if (chromeStorage) {
    await chromeStorage.set({
      [key]: value
    });
    return;
  }

  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Preview storage is optional.
  }
}

async function updateActionIcon(bot: BotIdentityForStorage): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return;
  }

  await chrome.runtime.sendMessage({
    type: "superior-set-action-icon",
    bot
  });
}

function createLocalId(prefix: string): string {
  const randomValue =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(16).slice(2, 18).padEnd(16, "0");

  return `${prefix}_${randomValue}`;
}

function getChromeStorage(): typeof chrome.storage.local | null {
  return typeof chrome !== "undefined" && chrome.storage?.local ? chrome.storage.local : null;
}

function writeStatus(element: HTMLElement | null, value: string): void {
  if (element) {
    element.textContent = value;
  }
}
