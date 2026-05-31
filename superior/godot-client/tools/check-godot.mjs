import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const candidates = [
  process.env.GODOT_BIN,
  "godot",
  "godot4",
  "godot_console",
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "Microsoft",
    "WinGet",
    "Packages",
    "GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "Godot_v4.6.3-stable_win64_console.exe"
  )
].filter(Boolean);

for (const command of candidates) {
  if (command.includes("\\") && !existsSync(command)) {
    continue;
  }

  const result = spawnSync(command, ["--version"], { encoding: "utf8", shell: true });
  if (result.status === 0) {
    console.log(`${command}: ${result.stdout.trim()}`);
    process.exit(0);
  }
}

console.error("Godot 4.x is not on PATH. Install Godot, then open superior/godot-client/project.godot.");
process.exit(1);
