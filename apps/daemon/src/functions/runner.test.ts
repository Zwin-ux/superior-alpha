import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BOT_IDENTITY,
  SuperiorFunctionRunRequest,
  createArticleXrayRequest,
  createCustomSkillImportRequest,
  createSuperiorFunctionRunRequest
} from "@clawdbot/shared";
import { completeBrowserPairing, resetBrowserPairing, startBrowserPairing } from "../browserLinkStore.js";
import { DaemonConfig } from "../config.js";
import { readSuperiorFunctionCatalog } from "./catalog.js";
import { readRecentFunctionRuns } from "./runEventsStore.js";
import { isSuperiorFunctionError, runSuperiorFunction } from "./runner.js";

const testConfig: DaemonConfig = {
  host: "127.0.0.1",
  port: 5317,
  openaiApiKey: undefined,
  openaiModel: "gpt-4.1-mini",
  localStateDirectory: ".clawdbot-test",
  keyFilePath: ".clawdbot-test/.env.local",
  keyFilePresent: false,
  openaiConfigSource: "missing",
  version: "test"
};
const fixtureRoot = join(process.cwd(), ".test-function-runner");

describe("SUPERIOR function runner", () => {
  afterEach(() => {
    resetBrowserPairing();
    rmSync(fixtureRoot, {
      recursive: true,
      force: true
    });
  });

  it("lists runnable robot functions", () => {
    expect(readSuperiorFunctionCatalog().items.map((item) => item.id)).toEqual([
      "page-explainer",
      "article-xray",
      "repo-reader",
      "superior-browser-start",
      "superior-browser-stop",
      "custom-skill-import-proposal"
    ]);
  });

  it("returns a typed error for unknown function ids", async () => {
    const request: SuperiorFunctionRunRequest = {
      type: "superior-function-run",
      requestId: "function_test",
      functionId: "missing-skill" as SuperiorFunctionRunRequest["functionId"],
      input: {},
      createdAt: new Date(0).toISOString()
    };
    const output = await runSuperiorFunction(request, {
      config: testConfig,
      trustedLocalOrigin: true
    });

    if (!isSuperiorFunctionError(output)) {
      throw new Error("Expected unknown function to fail.");
    }

    expect(output.type).toBe("superior-function-error");
    expect(output.code).toBe("unknown_function");
  });

  it("runs the deterministic skill harness and creates a physical bot reaction", async () => {
    const pairing = startBrowserPairing();

    completeBrowserPairing(pairing.pairingToken, "extension_test");

    const articleRequest = createArticleXrayRequest({
      pairingToken: pairing.pairingToken,
      bot: DEFAULT_BOT_IDENTITY,
      page: {
        url: "https://example.com/read",
        title: "Readable",
        selectedText:
          "SUPERIOR reads this sample article text as a deterministic function harness. It is long enough to prove the runner, recent proof, and bot reaction without calling a model.",
        capturedAt: new Date(0).toISOString()
      }
    });
    const output = await runSuperiorFunction(
      createSuperiorFunctionRunRequest({
        functionId: "article-xray",
        input: articleRequest,
        bot: DEFAULT_BOT_IDENTITY
      }),
      {
        config: testConfig,
        pairingHeaderToken: pairing.pairingToken,
        trustedLocalOrigin: true
      }
    );

    if (isSuperiorFunctionError(output)) {
      throw new Error(output.message);
    }

    expect(output.type).toBe("superior-function-run-result");
    expect(output.botReaction.state).toBe("success");
    expect(output.botReaction.slot).toBe("eye");
    expect(output.events.map((event) => event.kind)).toContain("result_saved");
    expect(readRecentFunctionRuns().items[0]?.botReaction.pulseKey).toBe(output.botReaction.pulseKey);
  });

  it("runs custom skill import proposal through the function runner", async () => {
    const projectFolder = join(fixtureRoot, "custom-runner-skill");

    mkdirSync(join(projectFolder, "src"), {
      recursive: true
    });
    writeFileSync(
      join(projectFolder, "package.json"),
      JSON.stringify({
        name: "@superior/custom-runner-skill",
        scripts: {
          test: "vitest run"
        }
      }),
      "utf8"
    );
    writeFileSync(join(projectFolder, "src", "index.ts"), "export const run = () => 'ok';", "utf8");

    const output = await runSuperiorFunction(
      createSuperiorFunctionRunRequest({
        functionId: "custom-skill-import-proposal",
        input: createCustomSkillImportRequest({
          folderPath: projectFolder
        }),
        bot: DEFAULT_BOT_IDENTITY
      }),
      {
        config: testConfig,
        trustedLocalOrigin: true
      }
    );

    if (isSuperiorFunctionError(output)) {
      throw new Error(output.message);
    }

    expect(output.functionId).toBe("custom-skill-import-proposal");
    expect((output.result as { type?: string }).type).toBe("custom-skill-import-proposal");
    expect(output.botReaction.state).toBe("success");
    expect(output.events.map((event) => event.kind)).toContain("result_saved");
  });

  it("runs browser stop through the function runner", async () => {
    const output = await runSuperiorFunction(
      createSuperiorFunctionRunRequest({
        functionId: "superior-browser-stop",
        input: {
          type: "superior-browser-stop"
        },
        bot: DEFAULT_BOT_IDENTITY
      }),
      {
        config: testConfig,
        trustedLocalOrigin: true
      }
    );

    if (isSuperiorFunctionError(output)) {
      throw new Error(output.message);
    }

    expect(output.functionId).toBe("superior-browser-stop");
    expect((output.result as { type?: string }).type).toBe("superior-browser-stop-result");
    expect(output.botReaction.state).toBe("success");
  });
});
