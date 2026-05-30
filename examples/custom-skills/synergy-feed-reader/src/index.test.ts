import { describe, expect, it } from "vitest";
import { readFeed } from "./index";

describe("sample feed reader", () => {
  it("returns repeated feed terms", () => {
    expect(
      readFeed({
        title: "Sample",
        text: "article article browser browser browser local signal"
      }).repeatedTerms
    ).toEqual(["browser", "article"]);
  });
});
