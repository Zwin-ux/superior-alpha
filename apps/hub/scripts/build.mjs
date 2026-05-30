import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "./validate-hub.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "src"), { recursive: true });

for (const file of ["index.html", "src/styles.css", "src/main.js", "src/hub-data.js", "src/favicon.svg"]) {
  await copyFile(join(root, file), join(dist, file));
}

console.log(`SUPERIOR hub built at ${dist}`);
