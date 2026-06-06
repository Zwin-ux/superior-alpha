# SUPERIOR ChatGPT App

This is the ChatGPT platform port for SUPERIOR Pocket Walker.

It is not a clone of the desktop Workshop. It is a small carried companion for checking the active spore, equipped loadout, recent proof, device state, mobile asset readiness, and the next dock-back route.

## Product Angle

SUPERIOR already targets many shells: Windows, extension, mobile, hub, Godot, and future native hosts. The ChatGPT app should feel like a pocket companion device, not a remote control:

- carry a safe mini version of the bot through ChatGPT
- show loadout, proof hints, and readiness from a closed-world companion envelope
- recommend which surface should handle the user's next move
- keep secrets, pairing tokens, browser data, page text, repo files, and OS credentials out of ChatGPT
- dock users back to the installed app, daemon, or extension for local execution

## Commands

```powershell
corepack pnpm --filter @clawdbot/chatgpt-app build
corepack pnpm --filter @clawdbot/chatgpt-app start
```

For MCP clients that use stdio:

```powershell
corepack pnpm --filter @clawdbot/chatgpt-app build
corepack pnpm --filter @clawdbot/chatgpt-app start:stdio
```

## Runtime

Default HTTP endpoint:

```text
http://127.0.0.1:5827/mcp
```

Environment:

- `SUPERIOR_CHATGPT_APP_PORT`: override HTTP port.
- `SUPERIOR_DAEMON_URL`: optional local daemon URL, default `http://127.0.0.1:5317`.
- `SUPERIOR_CHATGPT_APP_ALLOWED_ORIGINS`: comma-separated browser origins allowed to call the local MCP endpoint, default `https://chatgpt.com,https://chat.openai.com`.

If the daemon is unavailable, the app returns an offline-safe snapshot instead of failing the ChatGPT surface.

## Submission Posture

The three tools are read-only, closed-world, and non-destructive. They return a safe companion snapshot, a dock-back recommendation, or the same pocket widget.

They do not run local skills, pair browsers, open profiles, collect secrets, save bot identity, mutate local or external state, or send page/repo content into ChatGPT. Privileged work stays in the installed SUPERIOR app, daemon, or extension.
