import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BOT_IDENTITY, updateBotIdentity } from "@clawdbot/shared";

const renderBotIconSetMock = vi.fn((bot: unknown) => ({
  16: { bot, size: 16 },
  32: { bot, size: 32 },
  48: { bot, size: 48 },
  128: { bot, size: 128 },
  256: { bot, size: 256 }
}));

vi.mock("./icon", () => ({
  renderBotIconSet: renderBotIconSetMock
}));

describe("extension identity sync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    renderBotIconSetMock.mockClear();
  });

  it("paints the stored bot first, then replaces it with daemon identity", async () => {
    const storedBot = updateBotIdentity(DEFAULT_BOT_IDENTITY, {
      name: "Pocket Clawd",
      body: "gremlin",
      color: "mossGreen",
      eye: "pixel"
    });
    const daemonBot = updateBotIdentity(DEFAULT_BOT_IDENTITY, {
      name: "Hermes",
      body: "scanner",
      color: "skyBlue",
      eye: "lens"
    });
    const chromeMock = installChromeMock({
      clawdbotBotIdentity: storedBot
    });

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, daemonBot)));

    const { syncBotIdentityFromDaemon } = await importFreshIdentitySync();
    const syncedBot = await syncBotIdentityFromDaemon({ force: true });

    expect(syncedBot.name).toBe("Hermes");
    expect(chromeMock.action.setIcon).toHaveBeenCalledTimes(2);
    expect(renderBotIconSetMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ name: "Pocket Clawd" }));
    expect(renderBotIconSetMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ name: "Hermes" }));
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      clawdbotBotIdentity: expect.objectContaining({
        name: "Hermes",
        body: "scanner",
        color: "skyBlue",
        eye: "lens"
      })
    });
  });

  it("keeps the stored bot icon when the daemon is offline", async () => {
    const storedBot = updateBotIdentity(DEFAULT_BOT_IDENTITY, {
      name: "Offline Clawd",
      body: "gremlin",
      color: "brickRed",
      eye: "pixel"
    });
    const chromeMock = installChromeMock({
      clawdbotBotIdentity: storedBot
    });

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("daemon offline");
    }));

    const { syncBotIdentityFromDaemon } = await importFreshIdentitySync();
    const syncedBot = await syncBotIdentityFromDaemon({ force: true });

    expect(syncedBot.name).toBe("Offline Clawd");
    expect(chromeMock.action.setIcon).toHaveBeenCalledTimes(1);
    expect(renderBotIconSetMock).toHaveBeenCalledWith(expect.objectContaining({ name: "Offline Clawd" }));
    expect(chromeMock.storage.local.set).not.toHaveBeenCalled();
  });

  it("throttles daemon checks but can refresh the current action icon", async () => {
    const storedBot = updateBotIdentity(DEFAULT_BOT_IDENTITY, {
      name: "Tab Clawd",
      body: "orb",
      color: "lavender",
      eye: "glow"
    });
    const fetchMock = vi.fn(async () => jsonResponse(200, storedBot));
    const chromeMock = installChromeMock({
      clawdbotBotIdentity: storedBot
    });

    vi.stubGlobal("fetch", fetchMock);

    const { syncBotIdentityFromDaemon } = await importFreshIdentitySync();
    await syncBotIdentityFromDaemon({ force: true });
    await syncBotIdentityFromDaemon();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(chromeMock.action.setIcon).toHaveBeenCalledTimes(1);
  });
});

async function importFreshIdentitySync(): Promise<typeof import("./identitySync")> {
  vi.resetModules();

  return import("./identitySync");
}

function installChromeMock(initialStorage: Record<string, unknown>) {
  const storage = { ...initialStorage };
  const chromeMock = {
    action: {
      setIcon: vi.fn(async () => undefined)
    },
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({
          [key]: storage[key]
        })),
        set: vi.fn(async (entries: Record<string, unknown>) => {
          Object.assign(storage, entries);
        })
      }
    }
  };

  vi.stubGlobal("chrome", chromeMock);

  return chromeMock;
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
