# SUPERIOR Video Proof Gate

Every finished product slice should leave a short MP4, not just a command log.

The video is for critique: gameplay feel, creature feedback, motion timing, icon consistency, and whether the function proof is visible through the bot instead of explained by copy.

## Current Command

```powershell
corepack pnpm video:proof
```

This records the alpha Workshop harness at `1280x720` and writes the latest artifact manifest to:

```text
.clawdbot/video-proof/latest.json
```

## Acceptance Bar

- MP4 exists and opens.
- Poster frame exists.
- The bot is visible before any tray/status details.
- The recording shows at least one creature/menu interaction.
- If the slice changed a function, the function should cause a physical bot reaction in the recording or be called out as missing.
- Verification notes include the MP4 path and any caveat.

## Release Habit

For each sprint close:

1. Run root checks.
2. Run the platform-specific proof.
3. Run `corepack pnpm video:proof`.
4. Add the MP4 path to `docs/alpha-verification.md`.

The fast harness video is the default until Godot is installed locally. The next real critique gate should record the Godot client booting into the signal room and reacting to a server patch.
