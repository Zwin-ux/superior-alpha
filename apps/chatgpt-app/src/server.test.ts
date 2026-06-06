import { describe, expect, it } from "vitest";
import { planSuperiorHandoff, readCompanionSnapshot, toCompanionSnapshot } from "./server.js";
import type { MobileCompanionResponse } from "@clawdbot/shared";

describe("SUPERIOR ChatGPT app", () => {
  it("uses ChatGPT as a pocket companion rather than an execution surface", () => {
    const handoff = planSuperiorHandoff("walk with my bot and show what it is carrying");

    expect(handoff.recommendedSurface).toBe("chatgpt");
    expect(handoff.label).toBe("Walk with ChatGPT Pocket");
    expect(handoff.nextAction).toContain("dock back to the Workshop");
  });

  it("routes browser work to the extension hand", () => {
    const handoff = planSuperiorHandoff("x-ray this article in my active browser tab");

    expect(handoff.recommendedSurface).toBe("extension");
    expect(handoff.proofCommand).toBe("corepack pnpm fixture:extension-skill");
  });

  it("routes mobile asks to companion prep without making it alpha scope", () => {
    const handoff = planSuperiorHandoff("show this on mobile");

    expect(handoff.recommendedSurface).toBe("mobile");
    expect(handoff.blockedBy[0]).toContain("not an active alpha surface");
  });

  it("keeps daemon failure details out of offline warnings", async () => {
    const previousDaemonUrl = process.env.SUPERIOR_DAEMON_URL;
    process.env.SUPERIOR_DAEMON_URL = "http://127.0.0.1:9/private-local-path";

    try {
      const snapshot = await readCompanionSnapshot("brief");
      const serializedWarnings = JSON.stringify(snapshot.warnings);

      expect(snapshot.source).toBe("offline-snapshot");
      expect(snapshot.warnings).toContain("Local daemon unavailable.");
      expect(serializedWarnings).not.toContain("private-local-path");
      expect(serializedWarnings).not.toContain("127.0.0.1:9");
    } finally {
      if (previousDaemonUrl === undefined) {
        delete process.env.SUPERIOR_DAEMON_URL;
      } else {
        process.env.SUPERIOR_DAEMON_URL = previousDaemonUrl;
      }
    }
  });

  it("sanitizes daemon companion data down to a ChatGPT-safe snapshot", () => {
    const companion: MobileCompanionResponse = {
      type: "superior-mobile-companion",
      bot: {
        id: "bot_1",
        name: "Clawd",
        body: "gremlin",
        color: "mossGreen",
        eye: "pixel",
        avatarAsset: "assets/bots/soul/icons/clawd-avatar-1024.png",
        equippedSkills: [
          {
            id: "article-xray",
            label: "Article X-Ray",
            slot: "eye",
            attachment: "Pressed clay lens",
            effect: "Clean readable text."
          }
        ]
      },
      account: {
        status: "signed-out",
        connectedProviders: [],
        detail: "Google / X / Discord pair_secret"
      },
      device: {
        browser: {
          status: "paired",
          extensionId: "safe-extension-id"
        },
        superiorBrowser: {
          status: "closed"
        },
        model: {
          modelProvider: "ollama",
          ollamaStatus: "missing",
          openAiKeyStatus: "missing",
          detail: "install or start Ollama debugPort=9222"
        }
      },
      recentProof: [
        {
          type: "mobile-companion-proof",
          id: "proof_1",
          source: "function-run",
          label: "Article X-Ray",
          status: "ready",
          summary:
            "Article X-Ray completed. page text: should not leak. OPENAI_API_KEY=sk-test123456789000 pair_browser_secret runtimePath=C:\\secret\\bot.json",
          detail: "Eye / article-xray",
          functionId: "article-xray",
          createdAt: new Date(0).toISOString()
        }
      ],
      asset: {
        id: "mobile-clawd-gremlin",
        version: "mobile-3d-0.1",
        format: "glb",
        runtimePath: "assets/bots/mobile-3d/generated/mobile-clawd-gremlin.glb",
        sourcePath: "assets/bots/mobile-3d/asset-manifest.json",
        triangleCount: 492,
        fileBytes: 19064,
        requiredNodeNames: ["Body_Gremlin"]
      },
      share: {
        status: "not-configured",
        acceptedInputs: ["url", "text"],
        detail: "Future lane."
      },
      privacy: {
        localOnly: true,
        excludes: ["OpenAI API keys", "raw browser pairing tokens", "page text"]
      },
      createdAt: new Date(0).toISOString()
    };

    const snapshot = toCompanionSnapshot(companion, "full");
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.botName).toBe("Clawd");
    expect(snapshot.pocket.mode).toBe("carry");
    expect(snapshot.pocket.returnTo).toContain("Windows Workshop");
    expect(snapshot.asset.triangleCount).toBe(492);
    expect(serialized).not.toContain("runtimePath");
    expect(serialized).not.toContain("pair_");
    expect(serialized).not.toContain("OPENAI_API_KEY");
    expect(serialized).not.toContain("debugPort");
    expect(serialized).not.toContain("should not leak");
    expect(serialized).not.toContain("C:\\secret");
    expect(serialized).toContain("[redacted page text]");
  });
});
