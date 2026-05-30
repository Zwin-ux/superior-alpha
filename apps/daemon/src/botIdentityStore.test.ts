import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_BOT_IDENTITY, updateBotIdentity } from "@clawdbot/shared";
import { readBotIdentity, writeBotIdentity } from "./botIdentityStore.js";

const stateDirectory = join(process.cwd(), ".test-clawdbot-state");

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

describe("bot identity store", () => {
  it("round-trips customized bot identity", () => {
    const customBot = updateBotIdentity(DEFAULT_BOT_IDENTITY, {
      body: "scanner",
      color: "brickRed",
      eye: "lens"
    });

    writeBotIdentity(customBot);

    const saved = readBotIdentity();

    expect(saved.body).toBe("scanner");
    expect(saved.color).toBe("brickRed");
    expect(saved.iconVariant.eye).toBe("lens");
  });
});
