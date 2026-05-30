import { PageContentBlock, PageContext } from "@clawdbot/shared";

const pairingStorageKey = "clawdbotPairingToken";

export async function captureActivePage(): Promise<PageContext> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("No active browser tab found.");
  }

  return capturePageFromTab(tab.id);
}

export async function capturePageFromTab(tabId: number, selectedTextOverride?: string): Promise<PageContext> {
  const [capture] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [selectedTextOverride ?? ""],
    func: (contextSelection: string) => {
      const selection = contextSelection.trim() || window.getSelection()?.toString().trim() || "";
      const bodyText = document.body?.innerText?.replace(/\s+/g, " ").trim() ?? "";
      const selectors = [
        "article h1",
        "article h2",
        "article h3",
        "article p",
        "article li",
        "article blockquote",
        "main h1",
        "main h2",
        "main h3",
        "main p",
        "main li",
        "main blockquote",
        "[role='article'] h1",
        "[role='article'] h2",
        "[role='article'] h3",
        "[role='article'] p",
        "[role='article'] li",
        "[role='article'] blockquote"
      ];
      const seen = new Set<string>();
      const readableBlocks = Array.from(document.querySelectorAll(selectors.join(",")))
        .map((element) => {
          const htmlElement = element as HTMLElement;
          const style = window.getComputedStyle(htmlElement);

          if (style.display === "none" || style.visibility === "hidden") {
            return null;
          }

          const text = htmlElement.innerText?.replace(/\s+/g, " ").trim() ?? "";

          if (!text) {
            return null;
          }

          const tag = htmlElement.tagName.toLowerCase();
          const type = tag.startsWith("h")
            ? "heading"
            : tag === "li"
              ? "list"
              : tag === "blockquote"
                ? "quote"
                : "paragraph";

          return { type, text };
        })
        .filter((block): block is { type: string; text: string } => Boolean(block))
        .filter((block) => {
          const key = block.text.toLowerCase();

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        })
        .slice(0, 80);

      return {
        url: window.location.href,
        title: document.title,
        ...(selection ? { selectedText: selection } : {}),
        readableBlocks,
        bodyText: bodyText.slice(0, 24000),
        capturedAt: new Date().toISOString()
      };
    }
  });

  if (!capture?.result) {
    throw new Error("SUPERIOR could not read this page.");
  }

  const result = capture.result as PageContext;

  const readableBlocks = result.readableBlocks?.filter(isPageContentBlock);

  return readableBlocks
    ? {
        ...result,
        readableBlocks
      }
    : result;
}

export async function getPairingToken(): Promise<string> {
  const token = await readPairingToken();

  if (!token) {
    throw new Error("Pair SUPERIOR before using browser skills.");
  }

  return token;
}

export async function readPairingToken(): Promise<string | null> {
  const chromeStorage = getChromeStorage();
  const existing = chromeStorage
    ? await chromeStorage.get(pairingStorageKey)
    : { [pairingStorageKey]: readPreviewPairingToken() };

  if (typeof existing[pairingStorageKey] === "string") {
    return existing[pairingStorageKey];
  }

  return null;
}

export async function savePairingToken(token: string): Promise<void> {
  const chromeStorage = getChromeStorage();

  if (chromeStorage) {
    await chromeStorage.set({
      [pairingStorageKey]: token
    });
    return;
  }

  writePreviewPairingToken(token);
}

export async function clearPairingToken(): Promise<void> {
  const chromeStorage = getChromeStorage();

  if (chromeStorage) {
    await chromeStorage.remove(pairingStorageKey);
    return;
  }

  clearPreviewPairingToken();
}

function isPageContentBlock(block: unknown): block is PageContentBlock {
  const maybeBlock = block as Partial<PageContentBlock>;

  return (
    typeof maybeBlock.text === "string" &&
    ["heading", "paragraph", "list", "quote"].includes(String(maybeBlock.type))
  );
}

function getChromeStorage(): typeof chrome.storage.local | null {
  return typeof chrome !== "undefined" && chrome.storage?.local ? chrome.storage.local : null;
}

function readPreviewPairingToken(): string | null {
  try {
    return globalThis.localStorage?.getItem(pairingStorageKey) ?? null;
  } catch {
    return null;
  }
}

function writePreviewPairingToken(token: string): void {
  try {
    globalThis.localStorage?.setItem(pairingStorageKey, token);
  } catch {
    // Browser preview storage is optional.
  }
}

function clearPreviewPairingToken(): void {
  try {
    globalThis.localStorage?.removeItem(pairingStorageKey);
  } catch {
    // Browser preview storage is optional.
  }
}
