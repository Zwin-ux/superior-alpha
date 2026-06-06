import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { findUp, getSuperiorStateDirectory } from "./localPaths.js";

export interface DaemonConfig {
  host: string;
  port: number;
  openaiApiKey: string | undefined;
  openaiModel: string;
  localStateDirectory: string;
  keyFilePath: string;
  keyFilePresent: boolean;
  openaiConfigSource: "environment" | "env-file" | "missing";
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  accountRedirectUrl?: string;
  version: string;
}

let envLoaded = false;
let loadedOpenAIKeyPath: string | undefined;

export function loadNearestEnvLocal(startDirectory = process.cwd()): void {
  if (envLoaded) {
    return;
  }

  envLoaded = true;

  for (const envPath of getEnvLocalCandidates(startDirectory)) {
    if (!existsSync(envPath)) {
      continue;
    }

    const content = readFileSync(envPath, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const equalsIndex = line.indexOf("=");

      if (equalsIndex === -1) {
        continue;
      }

      const key = line.slice(0, equalsIndex).trim();
      const rawValue = line.slice(equalsIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;

        if (key === "OPENAI_API_KEY" && value) {
          loadedOpenAIKeyPath = envPath;
        }
      }
    }
  }
}

export function getDaemonConfig(): DaemonConfig {
  const hadProcessOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

  loadNearestEnvLocal();

  const port = Number.parseInt(process.env.CLAWDBOT_DAEMON_PORT ?? "5317", 10);
  const localStateDirectory = getSuperiorStateDirectory();
  const keyFilePath = join(localStateDirectory, ".env.local");
  const openaiApiKey = process.env.OPENAI_API_KEY || undefined;
  const supabaseUrl = process.env.SUPABASE_URL || undefined;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || undefined;
  const accountRedirectUrl =
    process.env.SUPERIOR_AUTH_REDIRECT_URL ||
    `http://${process.env.CLAWDBOT_DAEMON_HOST ?? "127.0.0.1"}:${Number.isFinite(port) ? port : 5317}/account/oauth/callback`;

  return {
    host: process.env.CLAWDBOT_DAEMON_HOST ?? "127.0.0.1",
    port: Number.isFinite(port) ? port : 5317,
    openaiApiKey,
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    localStateDirectory,
    keyFilePath,
    keyFilePresent: existsSync(keyFilePath),
    openaiConfigSource: openaiApiKey ? (loadedOpenAIKeyPath || !hadProcessOpenAIKey ? "env-file" : "environment") : "missing",
    ...(supabaseUrl ? { supabaseUrl } : {}),
    ...(supabasePublishableKey ? { supabasePublishableKey } : {}),
    ...(accountRedirectUrl ? { accountRedirectUrl } : {}),
    version: process.env.npm_package_version ?? "0.2.0"
  };
}

function getEnvLocalCandidates(startDirectory: string): string[] {
  const candidates = [
    process.env.SUPERIOR_ENV_PATH ? resolve(process.env.SUPERIOR_ENV_PATH) : undefined,
    findUp(".env.local", startDirectory),
    join(getSuperiorStateDirectory(startDirectory), ".env.local")
  ].filter((candidate): candidate is string => Boolean(candidate));
  const uniqueCandidates = new Set<string>();

  for (const candidate of candidates) {
    uniqueCandidates.add(candidate);
  }

  return [...uniqueCandidates];
}
