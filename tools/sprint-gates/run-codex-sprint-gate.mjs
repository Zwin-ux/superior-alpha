#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const reportDir = path.join(repoRoot, ".clawdbot", "sprint-gates");
const outputLimit = 20000;

const laneCommands = {
  docs: [],
  tooling: [
    {
      label: "Sprint gate runner self-check",
      command: "node tools/sprint-gates/run-codex-sprint-gate.mjs --list-lanes"
    }
  ],
  "chatgpt-app": [
    {
      label: "ChatGPT app build",
      command: "corepack pnpm --filter @clawdbot/chatgpt-app build"
    },
    {
      label: "ChatGPT app tests",
      command: "corepack pnpm --filter @clawdbot/chatgpt-app test"
    },
    {
      label: "Pocket Walker smoke",
      command: "corepack pnpm --filter @clawdbot/chatgpt-app smoke:pocket"
    }
  ],
  "shared-contracts": [
    {
      label: "Shared contracts build",
      command: "corepack pnpm --filter @clawdbot/shared build"
    },
    {
      label: "Shared contracts tests",
      command: "corepack pnpm --filter @clawdbot/shared test"
    }
  ],
  daemon: [
    {
      label: "Daemon typecheck",
      command: "corepack pnpm --filter @clawdbot/daemon typecheck"
    },
    {
      label: "Daemon tests",
      command: "corepack pnpm --filter @clawdbot/daemon test"
    }
  ],
  extension: [
    {
      label: "Extension typecheck",
      command: "corepack pnpm --filter @clawdbot/extension typecheck"
    },
    {
      label: "Extension tests",
      command: "corepack pnpm --filter @clawdbot/extension test"
    },
    {
      label: "Extension build",
      command: "corepack pnpm --filter @clawdbot/extension build"
    }
  ],
  desktop: [
    {
      label: "Desktop typecheck",
      command: "corepack pnpm --filter @clawdbot/desktop typecheck"
    },
    {
      label: "Desktop build",
      command: "corepack pnpm --filter @clawdbot/desktop build"
    }
  ],
  godot: [
    {
      label: "Godot engine check",
      command: "corepack pnpm superior:engine-check"
    }
  ],
  "mobile-prep": [
    {
      label: "Mobile 3D asset gate",
      command: "corepack pnpm assets:mobile-3d"
    },
    {
      label: "Mobile companion fixture",
      command: "corepack pnpm fixture:mobile-companion"
    }
  ],
  windows: [
    {
      label: "Windows toolchain check",
      command: "corepack pnpm windows:check"
    },
    {
      label: "Windows proof gate",
      command: "corepack pnpm windows:proof"
    }
  ],
  root: [
    {
      label: "Root typecheck",
      command: "corepack pnpm typecheck"
    },
    {
      label: "Root tests",
      command: "corepack pnpm test"
    },
    {
      label: "Root build",
      command: "corepack pnpm build"
    }
  ]
};

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

if (args["list-lanes"]) {
  console.log(Object.keys(laneCommands).join("\n"));
  process.exit(0);
}

const lanes = normalizeList(args.lane);
const customCommands = normalizeList(args.command).map((command, index) => ({
  label: `Custom command ${index + 1}`,
  command
}));
const prompt = String(args.prompt ?? process.env.CODEX_SPRINT_PROMPT ?? "").trim();
const sprint = String(args.sprint ?? slugFromPrompt(prompt) ?? "codex-sprint").trim();
const runCommands = args["no-commands"] !== true;
const selectedLanes = lanes.length > 0 ? lanes : ["docs"];
const unknownLanes = selectedLanes.filter((lane) => !laneCommands[lane]);

if (unknownLanes.length > 0) {
  console.error(`Unknown sprint gate lane(s): ${unknownLanes.join(", ")}`);
  console.error(`Known lanes: ${Object.keys(laneCommands).join(", ")}`);
  process.exit(2);
}

const commands = [...selectedLanes.flatMap((lane) => laneCommands[lane]), ...customCommands];
const startedAt = new Date();
const report = {
  type: "superior-codex-sprint-gate",
  version: 1,
  sprint,
  prompt: prompt || null,
  lanes: selectedLanes,
  startedAt: startedAt.toISOString(),
  finishedAt: null,
  status: "running",
  gates: describeGates(selectedLanes),
  git: readGitSnapshot(),
  commands: []
};

if (runCommands) {
  for (const commandSpec of commands) {
    report.commands.push(await runCommand(commandSpec));
  }
}

const failedCommands = report.commands.filter((command) => command.exitCode !== 0);
report.finishedAt = new Date().toISOString();
report.status = failedCommands.length > 0 ? "failed" : runCommands && commands.length > 0 ? "passed" : "logged";
report.gitAfter = readGitSnapshot();

await mkdir(reportDir, { recursive: true });
const reportName = `${safeStamp(startedAt)}-${slugify(sprint)}.json`;
const reportPath = path.join(reportDir, reportName);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(reportDir, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log(`Sprint gate ${report.status}: ${path.relative(repoRoot, reportPath)}`);
for (const command of report.commands) {
  console.log(`- ${command.status}: ${command.label} (${command.durationMs}ms)`);
}

if (failedCommands.length > 0) {
  process.exitCode = 1;
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm gate:sprint -- --sprint <slug> --prompt "<prompt>" --lane <lane>

Examples:
  corepack pnpm gate:sprint -- --sprint chatgpt-pocket --lane chatgpt-app --lane root
  corepack pnpm gate:sprint -- --sprint docs-pass --prompt "tighten release notes" --lane docs --no-commands

Known lanes:
  ${Object.keys(laneCommands).join(", ")}
`);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (!arg.startsWith("--")) {
      appendArg(parsed, "_", arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();

    if (inlineValue !== undefined) {
      appendArg(parsed, key, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      appendArg(parsed, key, next);
      index += 1;
      continue;
    }

    appendArg(parsed, key, true);
  }

  return parsed;
}

function appendArg(target, key, value) {
  if (target[key] === undefined) {
    target[key] = value;
    return;
  }

  if (Array.isArray(target[key])) {
    target[key].push(value);
    return;
  }

  target[key] = [target[key], value];
}

function normalizeList(value) {
  if (value === undefined || value === true) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function describeGates(lanes) {
  return [
    {
      id: "intake",
      status: "manual",
      checks: [
        "Read project principles before product or UI changes.",
        "Name the sprint, target lanes, and user-facing outcome.",
        "Keep unrelated dirty worktree changes untouched."
      ]
    },
    {
      id: "scope",
      status: "manual",
      checks: [
        "Map every cross-process payload to shared contracts.",
        "Keep privileged execution local unless the sprint explicitly proves a safe remote boundary.",
        "Avoid generic SaaS/dashboard framing."
      ]
    },
    {
      id: "verification",
      status: "automated",
      lanes,
      commandCount: lanes.flatMap((lane) => laneCommands[lane] ?? []).length
    },
    {
      id: "log",
      status: "automated",
      checks: ["Write a sprint report under .clawdbot/sprint-gates/."]
    }
  ];
}

function readGitSnapshot() {
  return {
    branch: runGit(["branch", "--show-current"]).trim() || null,
    statusShort: runGit(["status", "--short"]),
    head: runGit(["rev-parse", "--short", "HEAD"]).trim() || null
  };
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return "";
  }

  return result.stdout.trimEnd();
}

function runCommand({ label, command }) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: repoRoot,
      shell: true,
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      stdout = keepTail(stdout + chunk.toString(), outputLimit);
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      stderr = keepTail(stderr + chunk.toString(), outputLimit);
    });

    child.on("close", (exitCode, signal) => {
      const durationMs = Date.now() - startedAt;
      resolve({
        label,
        command,
        status: exitCode === 0 ? "passed" : "failed",
        exitCode,
        signal,
        durationMs,
        stdoutTail: stdout,
        stderrTail: stderr
      });
    });
  });
}

function keepTail(value, limit) {
  if (value.length <= limit) {
    return value;
  }

  return value.slice(value.length - limit);
}

function slugFromPrompt(value) {
  if (!value) {
    return null;
  }

  return slugify(value).slice(0, 64) || null;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function safeStamp(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}
