import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BrowserLinkState, createPairingToken } from "@clawdbot/shared";
import { getSuperiorStateDirectory } from "./localPaths.js";

const browserLinkFileName = "browser-link.json";

interface StoredBrowserLinkState extends BrowserLinkState {
  updatedAt: string;
}

export function readBrowserLinkState(): BrowserLinkState {
  try {
    const state = readStoredBrowserLinkState();

    return toPublicBrowserLinkState(state);
  } catch {
    return {
      status: "unpaired"
    };
  }
}

export function startBrowserPairing(): { pairingToken: string; browserLinkState: BrowserLinkState } {
  const pairingToken = createPairingToken();

  writeStoredBrowserLinkState({
    status: "pairing",
    pairingToken,
    updatedAt: new Date().toISOString()
  });

  return {
    pairingToken,
    browserLinkState: {
      status: "pairing"
    }
  };
}

export function completeBrowserPairing(pairingToken: string, extensionId?: string): BrowserLinkState | null {
  const state = readStoredBrowserLinkState();

  if (!state.pairingToken || state.pairingToken !== pairingToken) {
    return null;
  }

  const lastSeenAt = new Date().toISOString();

  writeStoredBrowserLinkState({
    status: "paired",
    pairingToken,
    ...(extensionId ? { extensionId } : {}),
    lastSeenAt,
    updatedAt: lastSeenAt
  });

  return {
    status: "paired",
    ...(extensionId ? { extensionId } : {}),
    lastSeenAt
  };
}

export function touchBrowserPairing(pairingToken: string): BrowserLinkState | null {
  const state = readStoredBrowserLinkState();

  if (state.status !== "paired" || !state.pairingToken || state.pairingToken !== pairingToken) {
    return null;
  }

  const lastSeenAt = new Date().toISOString();

  writeStoredBrowserLinkState({
    ...state,
    lastSeenAt,
    updatedAt: lastSeenAt
  });

  return toPublicBrowserLinkState({
    ...state,
    lastSeenAt
  });
}

export function resetBrowserPairing(): BrowserLinkState {
  writeStoredBrowserLinkState({
    status: "unpaired",
    updatedAt: new Date().toISOString()
  });

  return {
    status: "unpaired"
  };
}

function readStoredBrowserLinkState(): StoredBrowserLinkState {
  const filePath = getBrowserLinkFilePath();

  if (!existsSync(filePath)) {
    return {
      status: "unpaired",
      updatedAt: new Date().toISOString()
    };
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<StoredBrowserLinkState>;

  return {
    status: parsed.status ?? "unpaired",
    ...(typeof parsed.pairingToken === "string" ? { pairingToken: parsed.pairingToken } : {}),
    ...(typeof parsed.extensionId === "string" ? { extensionId: parsed.extensionId } : {}),
    ...(typeof parsed.lastSeenAt === "string" ? { lastSeenAt: parsed.lastSeenAt } : {}),
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString()
  };
}

function writeStoredBrowserLinkState(state: StoredBrowserLinkState): void {
  const filePath = getBrowserLinkFilePath();

  mkdirSync(dirname(filePath), {
    recursive: true
  });
  writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
}

function toPublicBrowserLinkState(state: StoredBrowserLinkState): BrowserLinkState {
  return {
    status: state.status,
    ...(state.extensionId ? { extensionId: state.extensionId } : {}),
    ...(state.lastSeenAt ? { lastSeenAt: state.lastSeenAt } : {})
  };
}

function getBrowserLinkFilePath(): string {
  return join(getSuperiorStateDirectory(), browserLinkFileName);
}
