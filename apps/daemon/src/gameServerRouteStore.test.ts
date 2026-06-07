import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGameServerRouteSaveRequest } from "@clawdbot/shared";
import {
  buildGmodConnectArgs,
  parseGmodServerRoute,
  readGameServerRoutes,
  saveGameServerRoute
} from "./gameServerRouteStore.js";

let testRoot = "";
const previousStateDirectory = process.env.CLAWDBOT_STATE_DIR;

beforeEach(() => {
  testRoot = join(tmpdir(), `superior-gmod-routes-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(testRoot, {
    recursive: true
  });
  process.env.CLAWDBOT_STATE_DIR = join(testRoot, "state");
});

afterEach(() => {
  rmSync(testRoot, {
    recursive: true,
    force: true
  });
  restoreEnv("CLAWDBOT_STATE_DIR", previousStateDirectory);
});

describe("GMOD server router", () => {
  it("parses manual ip:port routes", () => {
    const route = parseGmodServerRoute("127.0.0.1:27015");

    expect(route.address).toBe("127.0.0.1:27015");
    expect(route.source).toBe("manual");
  });

  it("parses BattleMetrics-style pasted routes with address query", () => {
    const route = parseGmodServerRoute("https://www.battlemetrics.com/servers/gmod/123456?server=203.0.113.20:27015");

    expect(route.address).toBe("203.0.113.20:27015");
    expect(route.source).toBe("battlemetrics");
    expect(route.battlemetricsUrl).toBe("https://www.battlemetrics.com/servers/gmod/123456");
  });

  it("saves route metadata and builds GMOD connect args", () => {
    const saved = saveGameServerRoute(
      createGameServerRouteSaveRequest({
        label: "DarkRP route",
        addressOrUrl: "203.0.113.20:27015",
        password: "private",
        playerName: "Clawd"
      })
    );
    const routes = readGameServerRoutes();

    expect(saved.route.status).toBe("ready");
    expect(routes.items).toHaveLength(1);
    expect(buildGmodConnectArgs(saved.route)).toEqual([
      "+connect",
      "203.0.113.20:27015",
      "+password",
      "private",
      "+name",
      "Clawd"
    ]);
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
