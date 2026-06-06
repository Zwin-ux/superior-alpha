import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const appRoot = path.resolve(path.dirname(scriptPath), "..");
const builtServerPath = path.join(appRoot, "dist", "server.js");

process.env.SUPERIOR_CHATGPT_APP_PORT = "0";
process.env.SUPERIOR_DAEMON_URL = "http://127.0.0.1:9";

let exitCode = 0;
let offlineDaemon;

try {
  await access(builtServerPath);

  const serverModule = await importBuiltServerQuietly(builtServerPath);

  assert.equal(typeof serverModule.createPocketWalkerHtml, "function", "createPocketWalkerHtml export is missing.");
  const html = serverModule.createPocketWalkerHtml();
  assert.equal(typeof html, "string", "createPocketWalkerHtml did not return a string.");
  assert.match(html, /<html[\s>]/i, "Pocket Walker output is not HTML.");
  assert.match(html, /SUPERIOR Pocket Walker/, "Pocket Walker HTML does not include the product title.");

  assert.equal(typeof serverModule.planSuperiorHandoff, "function", "planSuperiorHandoff export is missing.");
  assert.equal(
    serverModule.planSuperiorHandoff("x-ray this article in my active browser tab").recommendedSurface,
    "extension",
    "Browser/page intent must route to the extension."
  );
  assert.equal(
    serverModule.planSuperiorHandoff("show my pocket walker").recommendedSurface,
    "chatgpt",
    "Default pocket intent must stay in ChatGPT."
  );
  assert.equal(
    serverModule.planSuperiorHandoff("walk with my bot and show what it is carrying").recommendedSurface,
    "chatgpt",
    "Default companion carry intent must stay in ChatGPT."
  );

  assert.equal(typeof serverModule.readCompanionSnapshot, "function", "readCompanionSnapshot export is missing.");
  const offlineDaemonUrl = await startOfflineDaemon();
  process.env.SUPERIOR_DAEMON_URL = offlineDaemonUrl;

  const offlineSnapshot = await serverModule.readCompanionSnapshot("full");
  assert.equal(offlineSnapshot.status, "offline", "Offline daemon should return an offline snapshot.");
  assert.equal(offlineSnapshot.source, "offline-snapshot", "Offline daemon should use the offline snapshot source.");
  assert.ok(offlineSnapshot.privacy.localOnly, "Offline snapshot should remain local-only.");
  assert.ok(
    offlineSnapshot.warnings.some((warning) => warning.includes("Local daemon unavailable")),
    "Offline snapshot should explain the daemon is unavailable."
  );

  const serialized = JSON.stringify(offlineSnapshot);
  const forbiddenPatterns = [
    ["raw pairing token", /\bpair_[a-z0-9_]+\b/i],
    ["pairingToken key", /"pairingToken"\s*:/i],
    ["OPENAI_API_KEY", /OPENAI_API_KEY/i],
    ["runtimePath", /runtimePath/i],
    ["debugPort", /debugPort/i],
    ["page text key", /"(?:pageText|rawPageText|cleanText|documentText|textContent)"\s*:/i],
    ["page text payload", /page text\s*[:=]\s*[^",}]+/i]
  ];

  for (const [label, pattern] of forbiddenPatterns) {
    assert.doesNotMatch(serialized, pattern, `Offline snapshot leaked ${label}.`);
  }

  console.log("Pocket Walker smoke passed.");
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
  if (error?.code === "ENOENT") {
    console.error("Build first with: corepack pnpm --filter @clawdbot/chatgpt-app build");
  }
} finally {
  await closeServer(offlineDaemon);
  process.exit(exitCode);
}

async function importBuiltServerQuietly(serverPath) {
  const originalLog = console.log;
  console.log = (...args) => {
    const message = args.join(" ");
    if (!message.includes("SUPERIOR ChatGPT app MCP server listening")) {
      originalLog(...args);
    }
  };

  try {
    return await import(`${pathToFileURL(serverPath).href}?smoke=${Date.now()}`);
  } finally {
    console.log = originalLog;
  }
}

async function startOfflineDaemon() {
  offlineDaemon = createServer((_request, response) => {
    response.writeHead(503, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "offline smoke daemon" }));
  });

  await new Promise((resolve) => {
    offlineDaemon.listen(0, "127.0.0.1", resolve);
  });

  const address = offlineDaemon.address();
  assert.ok(address && typeof address === "object", "Offline daemon smoke server did not expose a port.");
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server) {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
