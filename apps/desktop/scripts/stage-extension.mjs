import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const extensionDist = join(scriptDir, "..", "..", "extension", "dist");
const stagedExtension = join(scriptDir, "..", "src-tauri", "resources", "extension");

if (!existsSync(join(extensionDist, "manifest.json"))) {
  throw new Error("Extension dist is missing. Run the extension build before staging.");
}

rmSync(stagedExtension, {
  recursive: true,
  force: true
});
mkdirSync(stagedExtension, {
  recursive: true
});
cpSync(extensionDist, stagedExtension, {
  recursive: true
});

console.log(`Staged SUPERIOR browser extension at ${stagedExtension}.`);
