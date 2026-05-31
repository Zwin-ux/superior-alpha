import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DaemonConfig } from "./config.js";
import { readModelProviderState, saveOpenAiKey, selectModelProvider } from "./modelProviderStore.js";

let stateDirectory = "";
let config: DaemonConfig;

beforeEach(() => {
  stateDirectory = mkdtempSync(join(tmpdir(), "superior-model-provider-"));
  config = {
    host: "127.0.0.1",
    port: 5317,
    openaiApiKey: undefined,
    openaiModel: "gpt-4.1-mini",
    localStateDirectory: stateDirectory,
    keyFilePath: join(stateDirectory, ".env.local"),
    keyFilePresent: false,
    openaiConfigSource: "missing",
    version: "test"
  };
});

afterEach(() => {
  rmSync(stateDirectory, {
    recursive: true,
    force: true
  });
});

describe("model provider store", () => {
  it("starts missing when no local provider is configured", () => {
    const state = readModelProviderState(config);

    expect(state.type).toBe("superior-model-provider-state");
    expect(["missing", "ollama"]).toContain(state.modelProvider);
    expect(["missing", "available"]).toContain(state.ollamaStatus);
    expect(state.openAiKeyStatus).toBe("missing");
  });

  it("persists the selected local Ollama lane", () => {
    const state = selectModelProvider(config, "ollama");

    expect(state.modelProvider).toBe("ollama");
    expect(readModelProviderState(config).modelProvider).toBe("ollama");
  });

  it("saves OpenAI BYOK in the daemon-readable env file", () => {
    const state = saveOpenAiKey(config, "sk-test", "gpt-4.1-mini");

    expect(state.modelProvider).toBe("openai-byok");
    expect(state.openAiKeyStatus).toBe("ready");
    expect(config.openaiApiKey).toBe("sk-test");
    expect(config.openaiConfigSource).toBe("env-file");
  });
});
