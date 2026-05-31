import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  SuperiorModelProvider,
  SuperiorModelProviderState,
  SuperiorOllamaStatus,
  SuperiorOpenAiKeyStatus
} from "@clawdbot/shared";
import { DaemonConfig } from "./config.js";

interface StoredModelProvider {
  modelProvider: SuperiorModelProvider;
  selectedAt: string;
}

export function readModelProviderState(config: DaemonConfig): SuperiorModelProviderState {
  const stored = readStoredModelProvider(config);
  const ollamaStatus = detectOllamaStatus();
  const openAiKeyStatus = readOpenAiKeyStatus(config);
  const modelProvider = stored?.modelProvider ?? inferModelProvider(ollamaStatus, openAiKeyStatus);

  return {
    type: "superior-model-provider-state",
    modelProvider,
    ollamaStatus,
    openAiKeyStatus,
    ...(stored?.selectedAt ? { selectedAt: stored.selectedAt } : {}),
    detail: describeModelProvider(modelProvider, ollamaStatus, openAiKeyStatus),
    createdAt: new Date().toISOString()
  };
}

export function selectModelProvider(
  config: DaemonConfig,
  provider: Exclude<SuperiorModelProvider, "missing">
): SuperiorModelProviderState {
  const stored: StoredModelProvider = {
    modelProvider: provider,
    selectedAt: new Date().toISOString()
  };
  const filePath = getModelProviderFilePath(config);

  mkdirSync(dirname(filePath), {
    recursive: true
  });
  writeFileSync(filePath, JSON.stringify(stored, null, 2), "utf8");

  return readModelProviderState(config);
}

export function saveOpenAiKey(config: DaemonConfig, apiKey: string, model?: string): SuperiorModelProviderState {
  const trimmedKey = apiKey.trim();

  if (!trimmedKey) {
    throw new Error("Paste an OpenAI key before saving BYOK.");
  }

  mkdirSync(dirname(config.keyFilePath), {
    recursive: true
  });

  const lines = [`OPENAI_API_KEY=${trimmedKey}`, `OPENAI_MODEL=${model?.trim() || config.openaiModel}`];
  writeFileSync(config.keyFilePath, `${lines.join("\n")}\n`, "utf8");
  process.env.OPENAI_API_KEY = trimmedKey;
  process.env.OPENAI_MODEL = model?.trim() || config.openaiModel;
  config.openaiApiKey = trimmedKey;
  config.openaiModel = model?.trim() || config.openaiModel;
  config.keyFilePresent = true;
  config.openaiConfigSource = "env-file";

  return selectModelProvider(config, "openai-byok");
}

export function startOllamaIfAvailable(config: DaemonConfig): SuperiorModelProviderState {
  const command = resolveOllamaCommand();

  if (!command) {
    return selectModelProvider(config, "ollama");
  }

  spawn(command, ["serve"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  }).unref();

  return selectModelProvider(config, "ollama");
}

function inferModelProvider(
  ollamaStatus: SuperiorOllamaStatus,
  openAiKeyStatus: SuperiorOpenAiKeyStatus
): SuperiorModelProvider {
  if (ollamaStatus === "available") {
    return "ollama";
  }

  if (openAiKeyStatus === "ready" || openAiKeyStatus === "saved") {
    return "openai-byok";
  }

  return "missing";
}

function describeModelProvider(
  provider: SuperiorModelProvider,
  ollamaStatus: SuperiorOllamaStatus,
  openAiKeyStatus: SuperiorOpenAiKeyStatus
): string {
  if (provider === "ollama") {
    return ollamaStatus === "available" ? "local Ollama available" : "install or start Ollama";
  }

  if (provider === "openai-byok") {
    return openAiKeyStatus === "ready" ? "OpenAI BYOK ready" : "OpenAI key saved for daemon restart";
  }

  return "choose local Ollama or OpenAI BYOK";
}

function readOpenAiKeyStatus(config: DaemonConfig): SuperiorOpenAiKeyStatus {
  if (config.openaiApiKey) {
    return "ready";
  }

  if (!existsSync(config.keyFilePath)) {
    return "missing";
  }

  try {
    const content = readFileSync(config.keyFilePath, "utf8");
    return /OPENAI_API_KEY=\S+/.test(content) ? "saved" : "invalid";
  } catch {
    return "invalid";
  }
}

function detectOllamaStatus(): SuperiorOllamaStatus {
  return resolveOllamaCommand() ? "available" : "missing";
}

function resolveOllamaCommand(): string | undefined {
  if (process.env.OLLAMA_PATH && existsSync(process.env.OLLAMA_PATH)) {
    return process.env.OLLAMA_PATH;
  }

  const lookup = spawnSync(process.platform === "win32" ? "where" : "which", ["ollama"], {
    encoding: "utf8"
  });

  return lookup.stdout
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function readStoredModelProvider(config: DaemonConfig): StoredModelProvider | undefined {
  try {
    const filePath = getModelProviderFilePath(config);

    if (!existsSync(filePath)) {
      return undefined;
    }

    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<StoredModelProvider>;

    if (parsed.modelProvider !== "ollama" && parsed.modelProvider !== "openai-byok") {
      return undefined;
    }

    return {
      modelProvider: parsed.modelProvider,
      selectedAt: typeof parsed.selectedAt === "string" ? parsed.selectedAt : new Date().toISOString()
    };
  } catch {
    return undefined;
  }
}

function getModelProviderFilePath(config: DaemonConfig): string {
  return join(config.localStateDirectory, "model-provider.json");
}
