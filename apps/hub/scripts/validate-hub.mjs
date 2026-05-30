import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const files = ["index.html", "src/styles.css", "src/main.js", "src/hub-data.js", "src/favicon.svg"];
const forbidden = [
  "OPENAI_API_KEY",
  "pairingToken",
  "pairing_token",
  "browser-profiles",
  ".env.local",
  "recent-results.json",
  "repo-workspaces.json"
];

for (const file of files) {
  const source = await readFile(join(root, file), "utf8");

  for (const token of forbidden) {
    if (source.includes(token)) {
      throw new Error(`Hub file ${file} contains forbidden local-runtime token: ${token}`);
    }
  }
}

console.log("SUPERIOR hub validation passed.");
