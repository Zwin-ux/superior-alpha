import { spawn } from "node:child_process";

const healthUrl = `http://${process.env.CLAWDBOT_DAEMON_HOST ?? "127.0.0.1"}:${
  process.env.CLAWDBOT_DAEMON_PORT ?? "5317"
}/health`;

if (await isAlive(healthUrl)) {
  console.log(`SUPERIOR daemon already running at ${healthUrl}`);
  process.exit(0);
}

const child = spawn("corepack", ["pnpm", "dev:raw"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32"
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

async function isAlive(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(800)
    });

    return response.ok;
  } catch {
    return false;
  }
}
