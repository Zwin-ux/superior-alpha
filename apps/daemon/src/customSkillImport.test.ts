import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCustomSkillImportRequest } from "@clawdbot/shared";
import { CustomSkillImportScanError, proposeCustomSkillImport } from "./customSkillImport.js";

const fixtureRoot = join(process.cwd(), ".test-custom-skill-import");

afterEach(() => {
  rmSync(fixtureRoot, {
    recursive: true,
    force: true
  });
});

describe("custom JS/TS skill import", () => {
  it("proposes an adapter shape for a JS/TS project folder", async () => {
    const projectFolder = join(fixtureRoot, "synergy-scraper");

    mkdirSync(join(projectFolder, "src"), {
      recursive: true
    });
    mkdirSync(join(projectFolder, "scripts"), {
      recursive: true
    });
    writeFileSync(
      join(projectFolder, "package.json"),
      JSON.stringify({
        name: "@buddy/synergy-scraper",
        main: "src/index.ts",
        scripts: {
          build: "tsc -p tsconfig.json",
          test: "vitest run",
          scrape: "tsx scripts/scrape.ts"
        }
      }),
      "utf8"
    );
    writeFileSync(join(projectFolder, "tsconfig.json"), "{}", "utf8");
    writeFileSync(join(projectFolder, "src", "index.ts"), "export const scrape = () => 'ok';", "utf8");
    writeFileSync(join(projectFolder, "scripts", "scrape.ts"), "console.log('ok');", "utf8");

    const proposal = await proposeCustomSkillImport(
      createCustomSkillImportRequest({
        folderPath: projectFolder
      })
    );

    expect(proposal.type).toBe("custom-skill-import-proposal");
    expect(proposal.language).toBe("typescript");
    expect(proposal.suggestedSkill.id).toBe("synergy-scraper");
    expect(proposal.suggestedSkill.slot).toBe("eye");
    expect(proposal.scripts.map((script) => script.name)).toContain("scrape");
    expect(proposal.fileSignals.map((signal) => signal.path)).toContain("src/index.ts");
  });

  it("rejects folders that do not look like JS/TS projects", async () => {
    const projectFolder = join(fixtureRoot, "notes-only");

    mkdirSync(projectFolder, {
      recursive: true
    });
    writeFileSync(join(projectFolder, "README.md"), "# Notes", "utf8");

    await expect(
      proposeCustomSkillImport(
        createCustomSkillImportRequest({
          folderPath: projectFolder
        })
      )
    ).rejects.toMatchObject({
      code: "unsupported_folder"
    } satisfies Partial<CustomSkillImportScanError>);
  });
});
