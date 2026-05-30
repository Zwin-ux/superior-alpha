import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const runtimeDir = join(scriptDir, "..", "src-tauri", "resources", "node");
const runtimePath = join(runtimeDir, process.platform === "win32" ? "node.exe" : "node");
const sourcePath = process.execPath;

if (!existsSync(sourcePath)) {
  throw new Error(`Could not find current Node runtime at ${sourcePath}`);
}

mkdirSync(runtimeDir, {
  recursive: true
});
copyFileSync(sourcePath, runtimePath);

const sizeMegabytes = (statSync(runtimePath).size / 1024 / 1024).toFixed(1);

console.log(`Staged ${basename(runtimePath)} for SUPERIOR desktop runtime (${sizeMegabytes} MB).`);
