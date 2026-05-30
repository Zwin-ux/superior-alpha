import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  completeBrowserPairing,
  readBrowserLinkState,
  resetBrowserPairing,
  startBrowserPairing,
  touchBrowserPairing
} from "./browserLinkStore.js";

const stateDirectory = join(process.cwd(), ".test-browser-link-state");

beforeEach(() => {
  process.env.CLAWDBOT_STATE_DIR = stateDirectory;
});

afterEach(() => {
  if (existsSync(stateDirectory)) {
    rmSync(stateDirectory, {
      recursive: true,
      force: true
    });
  }

  delete process.env.CLAWDBOT_STATE_DIR;
});

describe("browser link store", () => {
  it("starts and completes daemon-owned browser pairing", () => {
    const started = startBrowserPairing();

    expect(started.pairingToken).toMatch(/^pair_/);
    expect(started.browserLinkState.status).toBe("pairing");
    expect(readBrowserLinkState().status).toBe("pairing");

    const completed = completeBrowserPairing(started.pairingToken, "extension_test");

    expect(completed?.status).toBe("paired");
    expect(completed?.extensionId).toBe("extension_test");
    expect(completed?.pairingToken).toBeUndefined();

    expect(resetBrowserPairing().status).toBe("unpaired");
    expect(readBrowserLinkState().status).toBe("unpaired");
  });

  it("rejects unknown tokens", () => {
    startBrowserPairing();

    expect(completeBrowserPairing("pair_wrong")).toBeNull();
    expect(touchBrowserPairing("pair_wrong")).toBeNull();
  });

  it("rejects a paired token after reset", () => {
    const started = startBrowserPairing();

    expect(completeBrowserPairing(started.pairingToken)?.status).toBe("paired");
    expect(resetBrowserPairing().status).toBe("unpaired");
    expect(touchBrowserPairing(started.pairingToken)).toBeNull();
  });
});
