import {
  ArticleXrayRequest,
  ArticleXrayResult,
  PageContentBlock,
  getPageText
} from "@clawdbot/shared";

const MAX_BLOCKS = 52;
const MAX_CLEAN_TEXT_CHARACTERS = 12000;

const chromeLikeText = /^(menu|home|sign in|log in|subscribe|share|advertisement|privacy|terms|cookie settings)$/i;

export function runArticleXray(request: ArticleXrayRequest): ArticleXrayResult {
  const selectedText = request.page.selectedText?.trim();
  const readableBlocks = request.page.readableBlocks ?? [];
  let textSource: ArticleXrayResult["textSource"] = "body";
  let sourceBlocks: PageContentBlock[] = [];
  const warnings: string[] = [];

  if (selectedText) {
    textSource = "selection";
    sourceBlocks = blocksFromText(selectedText);
    warnings.push("Using selected text instead of the full page.");
  } else if (readableBlocks.length > 0) {
    textSource = "readable-blocks";
    sourceBlocks = readableBlocks;
  } else {
    sourceBlocks = blocksFromText(getPageText(request.page));
    warnings.push("Using page body fallback because no readable article blocks were captured.");
  }

  let cleanBlocks = cleanReadableBlocks(sourceBlocks);

  if (cleanBlocks.length === 0 && !selectedText && request.page.bodyText) {
    textSource = "body";
    cleanBlocks = cleanReadableBlocks(blocksFromText(request.page.bodyText));
    warnings.push("Readable blocks were too thin, so SUPERIOR fell back to body text.");
  }

  const fullCleanText = cleanBlocks.map((block) => block.text).join("\n\n");
  const wasTruncated = fullCleanText.length > MAX_CLEAN_TEXT_CHARACTERS;
  const cleanText = wasTruncated ? fullCleanText.slice(0, MAX_CLEAN_TEXT_CHARACTERS).trim() : fullCleanText;
  const outputCharacters = cleanText.length;
  const inputCharacters = getInputCharacters(request);
  const wordCount = countWords(cleanText);
  const paragraphCount = cleanBlocks.filter((block) => block.type !== "heading").length;
  const headingCount = cleanBlocks.filter((block) => block.type === "heading").length;
  const coverageRatio = inputCharacters > 0 ? roundRatio(outputCharacters / inputCharacters) : 0;

  if (wordCount < 80) {
    warnings.push("Only a small amount of readable article text was found.");
  }

  if (coverageRatio < 0.08 && inputCharacters > 3000) {
    warnings.push("The page looks noisy; most captured text was navigation, chrome, or repeated UI.");
  }

  if (wasTruncated) {
    warnings.push("Clean text was capped for the first local Article X-Ray pass.");
  }

  return {
    type: "article-xray-result",
    requestId: request.requestId,
    source: {
      url: request.page.url,
      title: request.page.title
    },
    textSource,
    quality: getQuality(wordCount, paragraphCount, coverageRatio, inputCharacters),
    headline: pickHeadline(cleanBlocks, request.page.title),
    excerpt: pickExcerpt(cleanBlocks, cleanText),
    cleanText,
    blocks: cleanBlocks,
    stats: {
      inputCharacters,
      outputCharacters,
      wordCount,
      paragraphCount,
      headingCount,
      coverageRatio
    },
    warnings,
    createdAt: new Date().toISOString()
  };
}

export function hasArticleContent(request: ArticleXrayRequest): boolean {
  return Boolean(
    request.page.selectedText?.trim() ||
      request.page.bodyText?.trim() ||
      request.page.readableBlocks?.some((block) => block.text.trim())
  );
}

function cleanReadableBlocks(blocks: PageContentBlock[]): PageContentBlock[] {
  const seen = new Set<string>();
  const cleanBlocks: PageContentBlock[] = [];

  for (const block of blocks) {
    const text = normalizeText(block.text);

    if (!isUsefulBlock(block.type, text)) {
      continue;
    }

    const fingerprint = text.toLowerCase();

    if (seen.has(fingerprint)) {
      continue;
    }

    seen.add(fingerprint);
    cleanBlocks.push({
      type: block.type,
      text: limitBlockText(text)
    });

    if (cleanBlocks.length >= MAX_BLOCKS) {
      break;
    }
  }

  return cleanBlocks;
}

function blocksFromText(text: string): PageContentBlock[] {
  return text
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((line) => normalizeText(line))
    .filter(Boolean)
    .map((line) => ({
      type: "paragraph" as const,
      text: line
    }));
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isUsefulBlock(type: PageContentBlock["type"], text: string): boolean {
  if (!text || chromeLikeText.test(text)) {
    return false;
  }

  if (type === "heading") {
    return text.length >= 4 && text.length <= 160;
  }

  return text.length >= 35 && countWords(text) >= 6;
}

function limitBlockText(text: string): string {
  if (text.length <= 1800) {
    return text;
  }

  return `${text.slice(0, 1800).trim()}...`;
}

function pickHeadline(blocks: PageContentBlock[], title: string): string {
  return blocks.find((block) => block.type === "heading")?.text || title || "Untitled page";
}

function pickExcerpt(blocks: PageContentBlock[], cleanText: string): string {
  const paragraph = blocks.find((block) => block.type !== "heading")?.text || cleanText;

  if (paragraph.length <= 260) {
    return paragraph;
  }

  return `${paragraph.slice(0, 257).trim()}...`;
}

function getInputCharacters(request: ArticleXrayRequest): number {
  const selectedLength = request.page.selectedText?.trim().length ?? 0;

  if (selectedLength > 0) {
    return selectedLength;
  }

  const blockLength =
    request.page.readableBlocks?.reduce((total, block) => total + normalizeText(block.text).length, 0) ?? 0;

  return Math.max(blockLength, request.page.bodyText?.trim().length ?? 0);
}

function getQuality(
  wordCount: number,
  paragraphCount: number,
  coverageRatio: number,
  inputCharacters: number
): ArticleXrayResult["quality"] {
  if (wordCount < 80 || paragraphCount < 2) {
    return "thin";
  }

  if (coverageRatio < 0.08 && inputCharacters > 3000) {
    return "noisy";
  }

  return "clean";
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}
