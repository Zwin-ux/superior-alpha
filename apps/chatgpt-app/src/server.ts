import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import type { MobileCompanionResponse } from "@clawdbot/shared";

const POCKET_WALKER_URI = "ui://superior/pocket-walker.html";
const DEFAULT_DAEMON_URL = "http://127.0.0.1:5317";
const DEFAULT_ALLOWED_ORIGINS = ["https://chatgpt.com", "https://chat.openai.com"];

const ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true
} as const;

const CompanionSnapshotSchema = z.object({
  status: z.enum(["online", "offline"]),
  source: z.enum(["daemon", "offline-snapshot"]),
  botName: z.string(),
  bot: z.object({
    body: z.string(),
    color: z.string(),
    eye: z.string(),
    equippedSkills: z.array(z.string())
  }),
  pocket: z.object({
    mode: z.enum(["carry", "dock"]),
    loop: z.string(),
    charge: z.string(),
    returnTo: z.string()
  }),
  account: z.object({
    status: z.string(),
    connectedProviders: z.array(z.string()),
    detail: z.string()
  }),
  device: z.object({
    browser: z.string(),
    superiorBrowser: z.string(),
    model: z.string()
  }),
  recentProof: z.array(
    z.object({
      label: z.string(),
      status: z.string(),
      summary: z.string()
    })
  ),
  asset: z.object({
    id: z.string(),
    format: z.literal("glb"),
    triangleCount: z.number(),
    fileBytes: z.number()
  }),
  platformRoutes: z.array(
    z.object({
      surface: z.string(),
      useWhen: z.string(),
      status: z.string()
    })
  ),
  privacy: z.object({
    localOnly: z.boolean(),
    excludes: z.array(z.string())
  }),
  warnings: z.array(z.string())
});

const HandoffPlanSchema = z.object({
  recommendedSurface: z.enum(["chatgpt", "windows", "extension", "mobile", "hub"]),
  label: z.string(),
  reason: z.string(),
  nextAction: z.string(),
  proofCommand: z.string().optional(),
  blockedBy: z.array(z.string()),
  privacyNote: z.string()
});

const PocketWalkerOutputSchema = z.object({
  widgetTitle: z.string(),
  companion: CompanionSnapshotSchema,
  handoff: HandoffPlanSchema
});

export type CompanionSnapshot = z.infer<typeof CompanionSnapshotSchema>;
export type HandoffPlan = z.infer<typeof HandoffPlanSchema>;

export function createSuperiorChatGptServer(): McpServer {
  const server = new McpServer(
    {
      name: "superior-pocket-walker",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  registerAppResource(
    server,
    "SUPERIOR Pocket Walker",
    POCKET_WALKER_URI,
    {
      title: "SUPERIOR Pocket Walker",
      description: "Pocket companion cartridge for carrying safe SUPERIOR bot status through ChatGPT.",
      _meta: {
        ui: {
          csp: {
            connectDomains: [],
            resourceDomains: []
          },
          prefersBorder: true
        }
      }
    },
    async () => ({
      contents: [
        {
          uri: POCKET_WALKER_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: createPocketWalkerHtml(),
          _meta: {
            ui: {
              csp: {
                connectDomains: [],
                resourceDomains: []
              },
              prefersBorder: true
            }
          }
        }
      ]
    })
  );

  server.registerTool(
    "superior_get_companion",
    {
      title: "Get SUPERIOR pocket companion",
      description:
        "Use this when the user wants the safe pocket-sized SUPERIOR bot, loadout, device, proof, and route snapshot without running local skills.",
      inputSchema: {
        detailLevel: z.enum(["brief", "full"]).default("brief")
      },
      outputSchema: CompanionSnapshotSchema,
      annotations: ToolAnnotations
    },
    async ({ detailLevel }) => {
      const companion = await readCompanionSnapshot(detailLevel);

      return {
        structuredContent: companion,
        content: [
          {
            type: "text",
            text: `${companion.botName} is ${companion.status}. Browser: ${companion.device.browser}. Model: ${companion.device.model}.`
          }
        ]
      };
    }
  );

  server.registerTool(
    "superior_plan_handoff",
    {
      title: "Plan SUPERIOR platform handoff",
      description:
        "Use this when the user wants to route a task to the right SUPERIOR surface, such as ChatGPT, Windows, browser extension, mobile, or hub.",
      inputSchema: {
        intent: z.string().min(1).max(800),
        preferredSurface: z.enum(["chatgpt", "windows", "extension", "mobile", "hub"]).optional()
      },
      outputSchema: HandoffPlanSchema,
      annotations: ToolAnnotations
    },
    async ({ intent, preferredSurface }) => {
      const handoff = planSuperiorHandoff(intent, preferredSurface);

      return {
        structuredContent: handoff,
        content: [
          {
            type: "text",
            text: `${handoff.label}: ${handoff.nextAction}`
          }
        ]
      };
    }
  );

  registerAppTool(
    server,
    "superior_render_field_desk",
    {
      title: "Render SUPERIOR Pocket Walker",
      description:
        "Use this when the user wants a visual ChatGPT pocket companion showing carried SUPERIOR status, proof, and the best dock-back route.",
      inputSchema: {
        intent: z.string().min(1).max(800).default("show current SUPERIOR status")
      },
      outputSchema: PocketWalkerOutputSchema,
      annotations: ToolAnnotations,
      _meta: {
        ui: {
          resourceUri: POCKET_WALKER_URI,
          visibility: ["model"]
        },
        "openai/outputTemplate": POCKET_WALKER_URI,
        "openai/toolInvocation/invoking": "Waking SUPERIOR pocket walker...",
        "openai/toolInvocation/invoked": "SUPERIOR pocket walker ready."
      }
    },
    async ({ intent }) => {
      const companion = await readCompanionSnapshot("brief");
      const handoff = planSuperiorHandoff(intent);
      const output = {
        widgetTitle: "SUPERIOR Pocket Walker",
        companion,
        handoff
      };

      return {
        structuredContent: output,
        content: [
          {
            type: "text",
            text: `${output.widgetTitle}: ${handoff.label}. ${handoff.nextAction}`
          }
        ],
        _meta: {
          companion,
          handoff
        }
      };
    }
  );

  return server;
}

export async function readCompanionSnapshot(detailLevel: "brief" | "full" = "brief"): Promise<CompanionSnapshot> {
  const daemonUrl = normalizeDaemonUrl(process.env.SUPERIOR_DAEMON_URL ?? DEFAULT_DAEMON_URL);

  try {
    const response = await fetch(`${daemonUrl}/mobile-companion`, {
      signal: AbortSignal.timeout(1200)
    });

    if (!response.ok) {
      throw new Error(`Daemon returned ${response.status}.`);
    }

    return toCompanionSnapshot((await response.json()) as MobileCompanionResponse, detailLevel);
  } catch (error) {
    if (process.env.SUPERIOR_CHATGPT_APP_DEBUG === "1") {
      console.warn(error instanceof Error ? error.message : error);
    }

    return {
      ...offlineCompanionSnapshot,
      warnings: [...offlineCompanionSnapshot.warnings, "Local daemon unavailable."]
    };
  }
}

export function toCompanionSnapshot(companion: MobileCompanionResponse, detailLevel: "brief" | "full"): CompanionSnapshot {
  const recentProof = companion.recentProof.slice(0, detailLevel === "full" ? 6 : 3).map((proof) => ({
    label: sanitizePublicText(proof.label),
    status: sanitizePublicText(proof.status),
    summary: sanitizePublicText(proof.summary, 280)
  }));

  return {
    status: "online",
    source: "daemon",
    botName: sanitizePublicText(companion.bot.name, 80),
    bot: {
      body: companion.bot.body,
      color: companion.bot.color,
      eye: companion.bot.eye,
      equippedSkills: companion.bot.equippedSkills.map((skill) => `${skill.slot}: ${sanitizePublicText(skill.label, 80)}`)
    },
    pocket: {
      mode: "carry",
      loop: companion.recentProof.length > 0 ? "Proof in pocket" : "Waiting for first proof",
      charge: companion.device.browser.status === "paired" ? "paired browser" : "local daemon",
      returnTo: "Dock at the Windows Workshop for skill execution."
    },
    account: {
      status: companion.account.status,
      connectedProviders: companion.account.connectedProviders,
      detail: sanitizePublicText(companion.account.detail, 180)
    },
    device: {
      browser: companion.device.browser.status,
      superiorBrowser: companion.device.superiorBrowser.status,
      model: sanitizePublicText(companion.device.model.detail, 180)
    },
    recentProof,
    asset: {
      id: companion.asset.id,
      format: companion.asset.format,
      triangleCount: companion.asset.triangleCount,
      fileBytes: companion.asset.fileBytes
    },
    platformRoutes: platformRoutes(),
    privacy: {
      localOnly: true,
      excludes: companion.privacy.excludes.map((item) => sanitizePublicText(item, 120))
    },
    warnings: []
  };
}

function sanitizePublicText(value: string, maxLength = 220): string {
  const redacted = value
    .replace(/\bOPENAI_API_KEY\b\s*=?\s*[A-Za-z0-9._-]*/gi, "[redacted key]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[redacted key]")
    .replace(/\bpair_[A-Za-z0-9_-]+\b/g, "[redacted pairing token]")
    .replace(/\bdebugPort\s*[:=]\s*\d+\b/gi, "[redacted debug port]")
    .replace(/\bruntimePath\s*[:=]\s*[^,\s]+/gi, "[redacted local path]")
    .replace(/\bpage text\s*[:=]\s*[^.\n]*(?:\.|$)/gi, "[redacted page text]")
    .replace(/[A-Za-z]:\\[^\s,;]+/g, "[redacted local path]")
    .replace(/\s+/g, " ")
    .trim();

  if (redacted.length <= maxLength) {
    return redacted;
  }

  return `${redacted.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

export function planSuperiorHandoff(intent: string, preferredSurface?: HandoffPlan["recommendedSurface"]): HandoffPlan {
  const normalized = `${preferredSurface ?? ""} ${intent}`.toLowerCase();

  if (preferredSurface) {
    return handoffForSurface(preferredSurface);
  }

  if (/\b(article|page|browser|tab|readable|x-ray|xray|explain)\b/.test(normalized)) {
    return handoffForSurface("extension");
  }

  if (/\b(repo|github|playpen|clone|workspace|codebase)\b/.test(normalized)) {
    return handoffForSurface("windows");
  }

  if (/\b(mobile|phone|ios|android|share sheet|share-sheet)\b/.test(normalized)) {
    return handoffForSurface("mobile");
  }

  if (/\b(release|artifact|proof|status|hub|readiness)\b/.test(normalized)) {
    return handoffForSurface("hub");
  }

  return handoffForSurface("chatgpt");
}

function handoffForSurface(surface: HandoffPlan["recommendedSurface"]): HandoffPlan {
  const plans: Record<HandoffPlan["recommendedSurface"], HandoffPlan> = {
    chatgpt: {
      recommendedSurface: "chatgpt",
      label: "Walk with ChatGPT Pocket",
      reason: "Best for carrying sanitized bot status, loadout, proof hints, and route choices without local side effects.",
      nextAction: "Check the pocket companion, choose the route, then dock back to the Workshop for real execution.",
      blockedBy: [],
      privacyNote: "This app only reads sanitized companion data or offline-safe status."
    },
    windows: {
      recommendedSurface: "windows",
      label: "Dock at Windows Workshop",
      reason: "Best for installed runtime proof, repo playpens, local daemon checks, and visible bot reactions.",
      nextAction: "Return the pocket companion to the installed SUPERIOR app, then run the proof from the Workshop.",
      proofCommand: "corepack pnpm windows:installed-loop-smoke",
      blockedBy: ["May require local daemon config and Windows policy allowances."],
      privacyNote: "Local execution stays on the machine; ChatGPT should not receive repo workspace secrets."
    },
    extension: {
      recommendedSurface: "extension",
      label: "Send to Browser Hand",
      reason: "Best for page context, active-tab actions, Article X-Ray, and Page Explainer handoff.",
      nextAction: "Pair the Chrome/Edge extension from SUPERIOR, then run the page skill from the browser.",
      proofCommand: "corepack pnpm fixture:extension-skill",
      blockedBy: ["Requires browser pairing token from the local daemon."],
      privacyNote: "The extension sends page context to the local daemon, not to this ChatGPT app."
    },
    mobile: {
      recommendedSurface: "mobile",
      label: "Prep Mobile Walker",
      reason: "Best for future carried identity, recent proof, device state, and share/capture status.",
      nextAction: "Keep mobile as a pocket companion prep lane until the Windows alpha loop is stable.",
      proofCommand: "corepack pnpm fixture:mobile-companion",
      blockedBy: ["Native mobile app is not an active alpha surface yet."],
      privacyNote: "Mobile consumes the sanitized companion contract and omits page text, raw tokens, and key paths."
    },
    hub: {
      recommendedSurface: "hub",
      label: "Dock at Release Hub",
      reason: "Best for release proof, artifact paths, caveats, and current alpha readiness.",
      nextAction: "Review the alpha verification docs and latest proof artifacts before publishing.",
      proofCommand: "corepack pnpm build",
      blockedBy: [],
      privacyNote: "The hub is a proof surface only and must not receive local secrets."
    }
  };

  return plans[surface];
}

function platformRoutes(): CompanionSnapshot["platformRoutes"] {
  return [
    {
      surface: "ChatGPT Pocket",
      useWhen: "Carry bot identity, loadout, proof hints, and dock-back route.",
      status: "alpha companion"
    },
    {
      surface: "Windows",
      useWhen: "Run local daemon, browser playpens, and installed proof.",
      status: "alpha flagship"
    },
    {
      surface: "Browser Extension",
      useWhen: "Send active page context to local SUPERIOR skills.",
      status: "alpha hand"
    },
    {
      surface: "Mobile Walker",
      useWhen: "Show identity, proof, device state, and share capture.",
      status: "prep only"
    }
  ];
}

const offlineCompanionSnapshot: CompanionSnapshot = {
  status: "offline",
  source: "offline-snapshot",
  botName: "Clawd",
  bot: {
    body: "gremlin",
    color: "mossGreen",
    eye: "pixel",
    equippedSkills: ["eye: Article X-Ray", "badge: Repo Reader"]
  },
  pocket: {
    mode: "dock",
    loop: "Offline carry shell",
    charge: "waiting for local daemon",
    returnTo: "Open the Windows Workshop to wake the live bot."
  },
  account: {
    status: "offline",
    connectedProviders: [],
    detail: "Local daemon not connected to this ChatGPT app."
  },
  device: {
    browser: "unpaired",
    superiorBrowser: "closed",
    model: "Open the installed app to check local model state."
  },
  recentProof: [],
  asset: {
    id: "mobile-clawd-gremlin",
    format: "glb",
    triangleCount: 492,
    fileBytes: 19064
  },
  platformRoutes: platformRoutes(),
  privacy: {
    localOnly: true,
    excludes: [
      "OpenAI API keys",
      "raw browser pairing tokens",
      "browser profile paths",
      "debug ports",
      "URL query secrets",
      "page text",
      "local repo workspace data"
    ]
  },
  warnings: ["Offline snapshot only; local SUPERIOR daemon was not reachable."]
};

function normalizeDaemonUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function createPocketWalkerHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      color-scheme: light;
      --ink: #241b17;
      --panel: #f3dcc0;
      --panel-dark: #a76545;
      --green: #6f8f52;
      --amber: #d99a42;
      --line: rgba(36, 27, 23, 0.18);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(circle at 18% 10%, rgba(255, 235, 175, 0.7), transparent 28%),
        linear-gradient(135deg, #7fa0a4 0%, #e3c295 47%, #965a40 100%);
    }
    main {
      min-height: 100vh;
      padding: 18px;
      box-sizing: border-box;
      display: grid;
      gap: 14px;
    }
    .cartridge {
      border: 2px solid rgba(36, 27, 23, 0.28);
      border-radius: 26px;
      background: rgba(243, 220, 192, 0.94);
      box-shadow: 0 18px 45px rgba(36, 27, 23, 0.24), inset 0 2px 0 rgba(255,255,255,0.5);
      overflow: hidden;
    }
    header {
      padding: 14px 16px;
      background: linear-gradient(90deg, #2b2f2a, #5c6f52);
      color: #fff4d6;
      display: flex;
      justify-content: space-between;
      align-items: center;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-size: 12px;
      font-weight: 800;
    }
    .grid {
      padding: 16px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
      gap: 14px;
    }
    .bot {
      min-height: 190px;
      border-radius: 24px;
      background:
        radial-gradient(circle at 50% 36%, #8faa69 0 18%, transparent 19%),
        radial-gradient(circle at 41% 32%, #171b16 0 3%, transparent 4%),
        radial-gradient(circle at 59% 32%, #171b16 0 3%, transparent 4%),
        radial-gradient(circle at 50% 58%, #6f8f52 0 34%, transparent 35%),
        linear-gradient(180deg, #e8c79d, #b47852);
      border: 1px solid var(--line);
      position: relative;
    }
    .bot:after {
      content: "";
      position: absolute;
      left: 22%;
      right: 22%;
      bottom: 18px;
      height: 16px;
      border-radius: 50%;
      background: rgba(36, 27, 23, 0.2);
      filter: blur(4px);
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 12px;
      background: rgba(255, 245, 224, 0.62);
    }
    .label {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6f4d36;
    }
    .value {
      margin: 0;
      font-size: 18px;
      font-weight: 900;
    }
    .small {
      margin: 6px 0 0;
      font-size: 13px;
      line-height: 1.35;
    }
    .stack {
      display: grid;
      gap: 10px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .chip {
      border: 1px solid rgba(36, 27, 23, 0.18);
      border-radius: 999px;
      padding: 5px 8px;
      background: rgba(255, 255, 255, 0.34);
      font-size: 12px;
      font-weight: 800;
    }
    @media (max-width: 620px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="cartridge">
      <header>
        <span>SUPERIOR Pocket Walker</span>
        <span id="status">OFFLINE</span>
      </header>
      <div class="grid">
        <div class="bot" aria-label="Clay bot silhouette"></div>
        <div class="stack">
          <div class="panel">
            <p class="label">Pocket Bot</p>
            <p class="value" id="botName">Clawd</p>
            <p class="small" id="botParts">Gremlin / Moss / Pixel</p>
            <p class="small" id="pocketLoop">Offline carry shell</p>
          </div>
          <div class="panel">
            <p class="label">Dock Route</p>
            <p class="value" id="route">ChatGPT Pocket</p>
            <p class="small" id="nextAction">Check the pocket companion, then dock back to Workshop.</p>
          </div>
          <div class="panel">
            <p class="label">Carry Pack</p>
            <p class="small" id="proof">No proof loaded yet.</p>
            <div class="chips" id="chips"></div>
          </div>
        </div>
      </div>
    </section>
  </main>
  <script>
    const fallback = ${JSON.stringify({
      widgetTitle: "SUPERIOR Pocket Walker",
      companion: offlineCompanionSnapshot,
      handoff: handoffForSurface("chatgpt")
    })};

    function pickPayload(message) {
      return message?.params?.result?.structuredContent || message?.params?.structuredContent || message?.structuredContent;
    }

    function render(payload) {
      const data = payload?.companion ? payload : fallback;
      const companion = data.companion;
      const handoff = data.handoff;
      document.getElementById("status").textContent = companion.status.toUpperCase();
      document.getElementById("botName").textContent = companion.botName;
      document.getElementById("botParts").textContent = [companion.bot.body, companion.bot.color, companion.bot.eye].join(" / ");
      document.getElementById("pocketLoop").textContent = [companion.pocket.loop, companion.pocket.charge].join(" / ");
      document.getElementById("route").textContent = handoff.label;
      document.getElementById("nextAction").textContent = handoff.nextAction;
      document.getElementById("proof").textContent = companion.recentProof[0]?.summary || "No recent proof in the safe snapshot.";
      const chips = document.getElementById("chips");
      chips.innerHTML = "";
      [...companion.bot.equippedSkills.slice(0, 3), companion.asset.id].forEach((item) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = item;
        chips.appendChild(chip);
      });
    }

    render(window.openai?.toolOutput || fallback);
    window.addEventListener("message", (event) => {
      const payload = pickPayload(event.data);
      if (payload) render(payload);
    });
  </script>
</body>
</html>`;
}

export async function startStdio(): Promise<void> {
  const server = createSuperiorChatGptServer();
  await server.connect(new StdioServerTransport());
}

export async function startHttpServer(port = Number.parseInt(process.env.SUPERIOR_CHATGPT_APP_PORT ?? "5827", 10)): Promise<void> {
  const mcpServer = createSuperiorChatGptServer();
  const transport = new StreamableHTTPServerTransport();
  await mcpServer.connect(transport as unknown as Transport);

  const httpServer = createServer(async (request, response) => {
    try {
      await routeHttpRequest(request, response, transport);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown server error."
        })
      );
    }
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, "127.0.0.1", resolve);
  });

  console.log(`SUPERIOR ChatGPT app MCP server listening on http://127.0.0.1:${port}/mcp`);
}

async function routeHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  transport: StreamableHTTPServerTransport
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (request.method === "OPTIONS") {
    if (!writeCors(request, response)) {
      writeJson(request, response, 403, {
        error: "Origin not allowed."
      });
      return;
    }

    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    writeJson(request, response, 200, {
      service: "superior-chatgpt-app",
      status: "ready",
      mcpPath: "/mcp"
    });
    return;
  }

  if (url.pathname === "/mcp") {
    if (!writeCors(request, response)) {
      writeJson(request, response, 403, {
        error: "Origin not allowed."
      });
      return;
    }

    await transport.handleRequest(request, response);
    return;
  }

  writeJson(request, response, 404, {
    error: "Not found."
  });
}

function writeCors(request: IncomingMessage, response: ServerResponse): boolean {
  const origin = request.headers.origin;
  const allowedOrigins = allowedCorsOrigins();

  if (typeof origin === "string") {
    if (!allowedOrigins.includes(origin)) {
      return false;
    }

    response.setHeader("Access-Control-Allow-Origin", origin);
  }

  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  return true;
}

function allowedCorsOrigins(): string[] {
  const configured = process.env.SUPERIOR_CHATGPT_APP_ALLOWED_ORIGINS;

  if (!configured) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function writeJson(request: IncomingMessage, response: ServerResponse, status: number, payload: unknown): void {
  writeCors(request, response);
  response.writeHead(status, {
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(payload));
}

function isDirectRun(): boolean {
  return process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  if (process.argv.includes("--stdio")) {
    await startStdio();
  } else {
    await startHttpServer();
  }
}
