export interface FeedReadInput {
  title: string;
  text: string;
}

export interface FeedReadResult {
  signal: "thin" | "useful" | "noisy";
  summary: string;
  repeatedTerms: string[];
}

export function readFeed(input: FeedReadInput): FeedReadResult {
  const words = input.text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);
  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const repeatedTerms = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([word]) => word);
  const signal = words.length < 40 ? "thin" : repeatedTerms.length > 3 ? "noisy" : "useful";

  return {
    signal,
    summary: `${input.title || "Feed"}: ${words.length} usable words, ${repeatedTerms.length} repeats.`,
    repeatedTerms
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    readFeed({
      title: "Sample feed",
      text: "alpha signal alpha signal browser article article scanner browser local skill"
    })
  );
}
