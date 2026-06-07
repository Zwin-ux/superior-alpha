import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  GameServerRoute,
  GameServerRouteSaveRequest,
  GameServerRouteSaveResult,
  GameServerRoutesResponse
} from "@clawdbot/shared";
import { getSuperiorStateDirectory } from "./localPaths.js";

interface StoredGameServerRoutesFile {
  type: "game-server-routes-store";
  items: GameServerRoute[];
  updatedAt: string;
}

export class GameServerRouteStoreError extends Error {
  constructor(
    readonly code: "bad_request",
    message: string
  ) {
    super(message);
  }
}

export function readGameServerRoutes(): GameServerRoutesResponse {
  return {
    type: "game-server-routes",
    items: readStoredRoutes(),
    storage: {
      localOnly: true,
      statePath: getGameServerRoutesStoragePath(),
      excludes: ["Supabase sync", "raw frames", "input logs", "OpenAI API keys"]
    },
    createdAt: new Date().toISOString()
  };
}

export function readGameServerRoute(routeId: string | undefined): GameServerRoute | null {
  if (!routeId) {
    return null;
  }

  return readStoredRoutes().find((route) => route.id === routeId) ?? null;
}

export function saveGameServerRoute(request: GameServerRouteSaveRequest): GameServerRouteSaveResult {
  if (request.type !== "game-server-route-save" || request.game !== "gmod") {
    throw new GameServerRouteStoreError("bad_request", "Game Router currently supports GMOD routes.");
  }

  const parsed = parseGmodServerRoute(request.addressOrUrl);
  const now = new Date().toISOString();
  const password = sanitizeSecret(request.password);
  const playerName = sanitizeLabel(request.playerName);
  const route: GameServerRoute = {
    type: "game-server-route",
    id: createRouteId(parsed.address),
    game: "gmod",
    source: parsed.source,
    label: sanitizeLabel(request.label) ?? parsed.label,
    address: parsed.address,
    ...(password ? { password } : {}),
    ...(playerName ? { playerName } : {}),
    ...(parsed.battlemetricsUrl ? { battlemetricsUrl: parsed.battlemetricsUrl } : {}),
    status: "ready",
    detail: "ready to connect",
    createdAt: now,
    updatedAt: now
  };
  const routes = readStoredRoutes().filter((item) => item.id !== route.id);

  writeStoredRoutes([...routes, route]);

  return {
    type: "game-server-route-save-result",
    requestId: request.requestId,
    route,
    routes: readGameServerRoutes(),
    createdAt: now
  };
}

export function parseGmodServerRoute(addressOrUrl: string): {
  address: string;
  source: "manual" | "battlemetrics";
  label: string;
  battlemetricsUrl?: string;
} {
  const rawValue = addressOrUrl.trim();

  if (!rawValue) {
    throw new GameServerRouteStoreError("bad_request", "Paste a GMOD server address or BattleMetrics URL.");
  }

  const url = parseUrl(rawValue);
  const address = extractServerAddress(url, rawValue);

  if (!isValidServerAddress(address)) {
    throw new GameServerRouteStoreError("bad_request", "Use a server address like 127.0.0.1:27015.");
  }

  return {
    address,
    source: url?.hostname.includes("battlemetrics.com") ? "battlemetrics" : "manual",
    label: url?.hostname.includes("battlemetrics.com") ? `BattleMetrics ${address}` : `GMOD ${address}`,
    ...(url?.hostname.includes("battlemetrics.com")
      ? { battlemetricsUrl: `${url.protocol}//${url.host}${url.pathname}` }
      : {})
  };
}

export function buildGmodConnectArgs(route: GameServerRoute | null): string[] {
  if (!route || route.status !== "ready") {
    return [];
  }

  const args = ["+connect", route.address];

  if (route.password) {
    args.push("+password", route.password);
  }

  if (route.playerName) {
    args.push("+name", route.playerName);
  }

  return args;
}

export function getGameServerRoutesStoragePath(): string {
  return join(getSuperiorStateDirectory(), "game-server-routes", "routes.json");
}

function readStoredRoutes(): GameServerRoute[] {
  const storePath = getGameServerRoutesStoragePath();

  if (!existsSync(storePath)) {
    return [];
  }

  try {
    const payload = JSON.parse(readFileSync(storePath, "utf8")) as Partial<StoredGameServerRoutesFile>;

    return Array.isArray(payload.items) ? payload.items.filter(isStoredGameServerRoute) : [];
  } catch {
    return [];
  }
}

function writeStoredRoutes(items: GameServerRoute[]): void {
  const storePath = getGameServerRoutesStoragePath();

  mkdirSync(dirname(storePath), {
    recursive: true
  });
  writeFileSync(
    storePath,
    JSON.stringify(
      {
        type: "game-server-routes-store",
        items,
        updatedAt: new Date().toISOString()
      } satisfies StoredGameServerRoutesFile,
      null,
      2
    ),
    "utf8"
  );
}

function extractServerAddress(url: URL | null, rawValue: string): string {
  if (!url) {
    return normalizeServerAddress(rawValue);
  }

  const queryCandidates = ["server", "address", "addr", "connect", "ip"];

  for (const key of queryCandidates) {
    const value = url.searchParams.get(key);

    if (value && isValidServerAddress(normalizeServerAddress(value))) {
      return normalizeServerAddress(value);
    }
  }

  const hashCandidate = /(?:server|address|connect)=([^&]+)/i.exec(url.hash)?.[1];

  if (hashCandidate && isValidServerAddress(normalizeServerAddress(hashCandidate))) {
    return normalizeServerAddress(hashCandidate);
  }

  const pathCandidate = /((?:\d{1,3}\.){3}\d{1,3}:\d{2,5})/.exec(url.pathname)?.[1];

  if (pathCandidate) {
    return normalizeServerAddress(pathCandidate);
  }

  throw new GameServerRouteStoreError(
    "bad_request",
    "BattleMetrics links need an address query, for example ?server=127.0.0.1:27015."
  );
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizeServerAddress(value: string): string {
  return decodeURIComponent(value).trim().replace(/^steam:\/\//i, "").replace(/^connect\//i, "");
}

function isValidServerAddress(value: string): boolean {
  const match = /^([a-z0-9.-]+):(\d{2,5})$/i.exec(value);

  if (!match) {
    return false;
  }

  const port = Number.parseInt(match[2] ?? "", 10);

  return Number.isInteger(port) && port > 0 && port <= 65535;
}

function sanitizeLabel(value: string | undefined): string | undefined {
  const label = value?.trim();

  return label ? label.slice(0, 80) : undefined;
}

function sanitizeSecret(value: string | undefined): string | undefined {
  const secret = value?.trim();

  return secret ? secret.slice(0, 80) : undefined;
}

function createRouteId(address: string): string {
  const digest = createHash("sha256").update(address.toLowerCase()).digest("hex").slice(0, 12);

  return `route_gmod_${digest}`;
}

function isStoredGameServerRoute(value: unknown): value is GameServerRoute {
  const route = value as Partial<GameServerRoute>;

  return (
    typeof route === "object" &&
    route !== null &&
    route.type === "game-server-route" &&
    route.game === "gmod" &&
    typeof route.id === "string" &&
    typeof route.label === "string" &&
    typeof route.address === "string" &&
    route.status === "ready"
  );
}
