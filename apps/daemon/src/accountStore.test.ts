import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredAccountSession,
  readStoredAccountState,
  writePendingAccountProvider,
  writeStoredAccountSession
} from "./accountStore.js";

const stateDirectory = join(process.cwd(), ".test-account-state");

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

describe("account store", () => {
  it("persists the pending OAuth provider and connected session", () => {
    writePendingAccountProvider("google");

    expect(readStoredAccountState().pendingProvider).toBe("google");

    writeStoredAccountSession({
      session: {
        type: "superior-account-session",
        userId: "user_test",
        email: "alpha@example.com",
        provider: "google",
        accessToken: "token_test",
        expiresAt: 1_770_000_000,
        createdAt: new Date(0).toISOString()
      },
      profile: {
        type: "superior-account-profile",
        userId: "user_test",
        email: "alpha@example.com",
        handle: "alpha",
        connectedProviders: ["google"],
        activeSporeId: "local-default",
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      }
    });

    const saved = readStoredAccountState();

    expect(saved.pendingProvider).toBeNull();
    expect(saved.session?.provider).toBe("google");
    expect(saved.profile?.handle).toBe("alpha");
    expect(saved.profile?.connectedProviders).toEqual(["google"]);
  });

  it("clears the stored session cleanly", () => {
    writePendingAccountProvider("x");
    clearStoredAccountSession();

    const saved = readStoredAccountState();

    expect(saved.session).toBeNull();
    expect(saved.profile).toBeNull();
    expect(saved.pendingProvider).toBeNull();
  });
});
