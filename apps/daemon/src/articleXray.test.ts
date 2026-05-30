import { describe, expect, it } from "vitest";
import { DEFAULT_BOT_IDENTITY, createArticleXrayRequest } from "@clawdbot/shared";
import { runArticleXray } from "./articleXray.js";

describe("Article X-Ray", () => {
  it("extracts clean readable blocks without OpenAI", () => {
    const request = createArticleXrayRequest({
      pairingToken: "pair_test",
      bot: DEFAULT_BOT_IDENTITY,
      page: {
        url: "https://example.com/article",
        title: "Clay Robots Are Good",
        bodyText:
          "Menu Subscribe Clay Robots Are Good Handmade desktop creatures feel memorable because they behave like owned tools instead of faceless dashboards.",
        readableBlocks: [
          {
            type: "heading",
            text: "Clay Robots Are Good"
          },
          {
            type: "paragraph",
            text: "Handmade desktop creatures feel memorable because they behave like owned tools instead of faceless dashboards."
          },
          {
            type: "paragraph",
            text: "The useful part is not the decoration; it is that the interface gives the user a stable object to recognize and return to."
          }
        ],
        capturedAt: new Date(0).toISOString()
      }
    });

    const result = runArticleXray(request);

    expect(result.type).toBe("article-xray-result");
    expect(result.textSource).toBe("readable-blocks");
    expect(result.headline).toBe("Clay Robots Are Good");
    expect(result.cleanText).toContain("owned tools");
    expect(result.stats.paragraphCount).toBe(2);
  });

  it("uses selected text when present", () => {
    const request = createArticleXrayRequest({
      pairingToken: "pair_test",
      bot: DEFAULT_BOT_IDENTITY,
      page: {
        url: "https://example.com/article",
        title: "Selected",
        selectedText:
          "This selected article passage has enough words to become the extraction source for a quick local X-Ray result.",
        bodyText: "Different body text that should not win.",
        capturedAt: new Date(0).toISOString()
      }
    });

    const result = runArticleXray(request);

    expect(result.textSource).toBe("selection");
    expect(result.cleanText).toContain("selected article passage");
    expect(result.cleanText).not.toContain("Different body text");
  });
});
