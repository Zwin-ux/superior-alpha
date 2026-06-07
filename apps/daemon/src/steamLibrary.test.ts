import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findSteamAppInstall, parseSteamAppManifest, parseSteamLibraryFolders } from "./steamLibrary.js";

let testRoot = "";

beforeEach(() => {
  testRoot = join(tmpdir(), `superior-steam-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(testRoot, {
    recursive: true
  });
});

afterEach(() => {
  rmSync(testRoot, {
    recursive: true,
    force: true
  });
});

describe("Steam library parser", () => {
  it("parses Steam library folders and app ids", () => {
    const folders = parseSteamLibraryFolders(`
"libraryfolders"
{
  "0"
  {
    "path" "C:\\\\Program Files (x86)\\\\Steam"
    "apps"
    {
      "4000" "12345"
    }
  }
  "1"
  {
    "path" "D:\\\\SteamLibrary"
  }
}`);

    expect(folders.map((folder) => folder.path)).toEqual([
      "C:\\Program Files (x86)\\Steam",
      "D:\\SteamLibrary"
    ]);
    expect(folders[0]?.apps["4000"]).toBe("12345");
  });

  it("parses appmanifest_4000.acf", () => {
    const manifest = parseSteamAppManifest(`
"AppState"
{
  "appid" "4000"
  "name" "Garry's Mod"
  "installdir" "GarrysMod"
}`);

    expect(manifest.appId).toBe("4000");
    expect(manifest.name).toBe("Garry's Mod");
    expect(manifest.installDir).toBe("GarrysMod");
  });

  it("finds GMOD from a fixture Steam root", () => {
    const steamRoot = join(testRoot, "Steam");
    const steamApps = join(steamRoot, "steamapps");

    mkdirSync(steamApps, {
      recursive: true
    });
    writeFileSync(
      join(steamApps, "appmanifest_4000.acf"),
      `
"AppState"
{
  "appid" "4000"
  "name" "Garry's Mod"
  "installdir" "GarrysMod"
}`,
      "utf8"
    );

    const install = findSteamAppInstall("4000", steamRoot);

    expect(install?.appId).toBe("4000");
    expect(install?.installDir).toBe("GarrysMod");
    expect(install?.libraryPath).toBe(steamRoot);
  });
});
