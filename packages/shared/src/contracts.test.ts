import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOT_IDENTITY,
  botCreationShapes,
  botSkillLoadoutOptions,
  botStarterPresetIds,
  botStarterPresets,
  createArticleXrayRequest,
  createBotIconSvg,
  createBotIdentityFromStarterPreset,
  createBotIdentityFromShape,
  createBotSporeFromIdentity,
  createBrowserPairingCompleteRequest,
  createCustomSkillImportRequest,
  createExplainPageRequest,
  createRepoReaderRequest,
  createSuperiorFunctionRunRequest,
  createSuperiorBrowserActivePageReport,
  createSuperiorBrowserAttachRequest,
  createSuperiorBrowserStartRequest,
  SuperiorAccountStartEmailCodeRequest,
  SuperiorModelProviderState,
  getEquippedSkillSlots,
  hasUsablePageText,
  makeBotCssVars,
  runnableSkillShelf,
  runnableSkillIds,
  skillCatalog,
  skillLabels,
  skillSlotLabels,
  updateBotIdentity
} from "./index.js";

describe("shared SUPERIOR contracts", () => {
  it("ships Page Explainer as the default skill", () => {
    expect(DEFAULT_BOT_IDENTITY.skills).toContain("page-explainer");
    expect(skillLabels["page-explainer"]).toBe("Page Explainer");
  });

  it("ships starter presets as active-bot seeds", () => {
    expect(botStarterPresetIds).toEqual(["clawd", "hermes", "mote"]);
    expect(botStarterPresets.map((preset) => preset.name)).toEqual(["Clawd", "Hermes", "Mote"]);

    const hermes = createBotIdentityFromStarterPreset("hermes", {
      createdAt: new Date(0).toISOString()
    });

    expect(hermes.name).toBe("Hermes");
    expect(hermes.body).toBe("scanner");
    expect(hermes.color).toBe("skyBlue");
    expect(hermes.eye).toBe("lens");
    expect(hermes.skills).toEqual(["page-explainer", "article-xray"]);
    expect(hermes.starterPresetId).toBe("hermes");
    expect(hermes.createdAt).toBe(new Date(0).toISOString());
  });

  it("starts creation from shape, then loadout", () => {
    expect(botCreationShapes.map((shape) => shape.id)).toEqual(["orb", "gremlin", "scanner", "sentinel", "core"]);
    expect(botSkillLoadoutOptions.map((option) => `${option.slot}:${option.skillId}`)).toEqual([
      "badge:page-explainer",
      "eye:article-xray",
      "side:repo-reader"
    ]);

    const scanner = createBotIdentityFromShape("scanner", {
      skills: ["page-explainer"],
      createdAt: new Date(0).toISOString()
    });

    expect(scanner.name).toBe("Hermes");
    expect(scanner.body).toBe("scanner");
    expect(scanner.color).toBe("skyBlue");
    expect(scanner.eye).toBe("lens");
    expect(scanner.skills).toEqual(["page-explainer"]);
    expect(scanner.starterPresetId).toBe("hermes");
  });

  it("keeps starter preset skills runnable-only", () => {
    const runnableIds = new Set(runnableSkillIds);

    for (const preset of botStarterPresets) {
      expect(preset.skills.length).toBeGreaterThan(0);
      expect(preset.skills.every((skillId) => runnableIds.has(skillId))).toBe(true);
    }
  });

  it("creates a portable spore without raw secrets", () => {
    const bot = updateBotIdentity(createBotIdentityFromStarterPreset("clawd"), {
      name: "Desk Clawd"
    });
    const spore = createBotSporeFromIdentity({
      ...bot,
      browserLinkState: {
        status: "paired",
        pairingToken: "raw_pairing_token_should_not_export",
        extensionId: "extension_safe_id",
        lastSeenAt: new Date(0).toISOString()
      }
    });

    expect(spore.schemaVersion).toBe("0.1");
    expect(spore.name).toBe("Desk Clawd");
    expect(spore.species).toBe("clawd");
    expect(spore.appearance.body).toBe("orb");
    expect(spore.appearance.avatarAsset).toContain("clawd-avatar");
    expect(spore.pairings.browser?.status).toBe("ready");
    expect(spore.pairings.browser?.safePairingId).toBe("extension_safe_id");
    expect(JSON.stringify(spore)).not.toContain("raw_pairing_token");
  });

  it("keeps the user loadout limited to runnable fixed-slot skills", () => {
    expect(DEFAULT_BOT_IDENTITY.skills).toEqual(["page-explainer", "article-xray", "repo-reader"]);
    expect(skillCatalog["page-explainer"].slot).toBe("badge");
    expect(skillCatalog["article-xray"].slot).toBe("eye");
    expect(skillCatalog["repo-reader"].slot).toBe("side");
    expect(skillSlotLabels.badge).toBe("Badge");
    expect(runnableSkillShelf.map((skill) => skill.id)).toEqual(["page-explainer", "article-xray", "repo-reader"]);

    const bot = updateBotIdentity(DEFAULT_BOT_IDENTITY, {
      skills: ["transcript-lens", "page-explainer"]
    });

    expect(bot.skills).toEqual(["page-explainer"]);
  });

  it("creates typed explain requests with page context", () => {
    const request = createExplainPageRequest({
      pairingToken: "pair_test",
      bot: DEFAULT_BOT_IDENTITY,
      page: {
        url: "https://example.com",
        title: "Example",
        bodyText: "A readable page body.",
        capturedAt: new Date(0).toISOString()
      }
    });

    expect(request.type).toBe("explain-page");
    expect(request.requestId).toMatch(/^explain_/);
    expect(hasUsablePageText(request.page)).toBe(true);
  });

  it("creates typed Article X-Ray requests with readable blocks", () => {
    const request = createArticleXrayRequest({
      pairingToken: "pair_test",
      bot: DEFAULT_BOT_IDENTITY,
      page: {
        url: "https://example.com/read",
        title: "Readable",
        bodyText: "Readable body.",
        readableBlocks: [
          {
            type: "heading",
            text: "Readable"
          },
          {
            type: "paragraph",
            text: "A focused article paragraph."
          }
        ],
        capturedAt: new Date(0).toISOString()
      }
    });

    expect(request.type).toBe("article-xray");
    expect(request.requestId).toMatch(/^xray_/);
    expect(request.page.readableBlocks?.[0]?.type).toBe("heading");
  });

  it("creates typed custom skill import requests for local JS/TS folders", () => {
    const request = createCustomSkillImportRequest({
      folderPath: "C:\\Users\\mzwin\\Documents\\Buddy\\synergy"
    });

    expect(request.type).toBe("custom-skill-import");
    expect(request.requestId).toMatch(/^skill_import_/);
    expect(request.folderPath).toContain("synergy");
  });

  it("creates typed Repo Reader requests for GitHub links", () => {
    const request = createRepoReaderRequest({
      repoUrl: "https://github.com/owner/project",
      bot: DEFAULT_BOT_IDENTITY
    });

    expect(request.type).toBe("repo-reader");
    expect(request.requestId).toMatch(/^repo_/);
    expect(request.repoUrl).toContain("github.com");
  });

  it("creates typed function runner requests for robot skills", () => {
    const articleRequest = createArticleXrayRequest({
      pairingToken: "pair_test",
      bot: DEFAULT_BOT_IDENTITY,
      page: {
        url: "https://example.com/read",
        title: "Readable",
        selectedText: "A focused article paragraph with enough words to run through the deterministic harness.",
        capturedAt: new Date(0).toISOString()
      }
    });
    const functionRequest = createSuperiorFunctionRunRequest({
      functionId: "article-xray",
      input: articleRequest,
      bot: DEFAULT_BOT_IDENTITY
    });

    expect(functionRequest.type).toBe("superior-function-run");
    expect(functionRequest.requestId).toMatch(/^function_/);
    expect(functionRequest.functionId).toBe("article-xray");
    expect(functionRequest.bot?.body).toBe("orb");
  });

  it("creates typed SUPERIOR Browser requests for saved repo playpens", () => {
    const startRequest = createSuperiorBrowserStartRequest({
      repoWorkspaceId: "owner/project",
      bot: DEFAULT_BOT_IDENTITY
    });
    const attachRequest = createSuperiorBrowserAttachRequest({
      sessionToken: "browser_token_test",
      extensionId: "extension_test"
    });

    expect(startRequest.type).toBe("superior-browser-start");
    expect(startRequest.requestId).toMatch(/^browser_/);
    expect(startRequest.repoWorkspaceId).toBe("owner/project");
    expect(attachRequest.type).toBe("superior-browser-attach");
    expect(attachRequest.requestId).toMatch(/^browser_attach_/);
    expect(attachRequest.extensionId).toBe("extension_test");
  });

  it("defines compact SUPERIOR Browser playpen events", () => {
    const event = {
      type: "superior-browser-event",
      id: "browser_event_test",
      sessionId: "browser_session_test",
      repoWorkspaceId: "owner/project",
      kind: "page_inspected",
      label: "Page inspected",
      createdAt: new Date(0).toISOString()
    } as const;

    expect(event.type).toBe("superior-browser-event");
    expect(event.kind).toBe("page_inspected");
  });

  it("defines compact SUPERIOR Browser inspection notes", () => {
    const inspection = {
      type: "superior-browser-inspection",
      status: "ready",
      inspectedAt: new Date(0).toISOString(),
      extensionPaired: true,
      currentUrl: "https://github.com/owner/project",
      pageTitle: "owner/project",
      consoleErrorCount: 0,
      networkFailureCount: 1
    } as const;

    expect(inspection.type).toBe("superior-browser-inspection");
    expect(inspection.extensionPaired).toBe(true);
    expect(inspection.networkFailureCount).toBe(1);
  });

  it("creates typed SUPERIOR Browser active page reports", () => {
    const report = createSuperiorBrowserActivePageReport({
      pairingToken: "pair_test",
      page: {
        url: "https://github.com/owner/project",
        title: "owner/project",
        tabId: 12,
        windowId: 3,
        capturedAt: new Date(0).toISOString()
      }
    });

    expect(report.type).toBe("superior-browser-active-page");
    expect(report.requestId).toMatch(/^browser_page_/);
    expect(report.page.url).toContain("github.com");
  });

  it("creates typed browser pairing completion requests", () => {
    const request = createBrowserPairingCompleteRequest({
      pairingToken: "pair_test",
      extensionId: "extension_test"
    });

    expect(request.type).toBe("browser-pairing-complete");
    expect(request.requestId).toMatch(/^browser_pair_/);
    expect(request.extensionId).toBe("extension_test");
  });

  it("defines account and model-provider setup contracts", () => {
    const accountRequest: SuperiorAccountStartEmailCodeRequest = {
      type: "superior-account-start-email-code",
      email: "alpha@example.com"
    };
    const modelState: SuperiorModelProviderState = {
      type: "superior-model-provider-state",
      modelProvider: "ollama",
      ollamaStatus: "missing",
      openAiKeyStatus: "missing",
      detail: "install or start Ollama",
      createdAt: new Date(0).toISOString()
    };

    expect(accountRequest.type).toBe("superior-account-start-email-code");
    expect(modelState.modelProvider).toBe("ollama");
    expect(modelState.openAiKeyStatus).toBe("missing");
  });

  it("maps bot identity to clay CSS variables", () => {
    expect(makeBotCssVars(DEFAULT_BOT_IDENTITY)["--bot-clay"]).toBe("#aa8ac2");
  });

  it("keeps icon identity in sync with customization", () => {
    const bot = updateBotIdentity(DEFAULT_BOT_IDENTITY, {
      body: "orb",
      color: "lavender",
      eye: "glow"
    });

    expect(bot.iconVariant.body).toBe("orb");
    expect(bot.iconVariant.color).toBe("lavender");
    expect(bot.iconVariant.eye).toBe("glow");
    expect(bot.starterPresetId).toBe("clawd");
  });

  it("renders tiny icon pieces from equipped skill slots", () => {
    const icon = createBotIconSvg(DEFAULT_BOT_IDENTITY);

    expect(getEquippedSkillSlots(DEFAULT_BOT_IDENTITY)).toEqual(["badge", "eye", "side"]);
    expect(icon).toContain("width=\"64\"");
    expect(icon).toContain("viewBox=\"0 0 64 64\"");
    expect(icon).toContain("#fff4dc");
    expect(icon).toContain("#7cc8d8");
  });
});
