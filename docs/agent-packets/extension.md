# Extension Packet

## Goal

Make the extension feel like the robot's browser hand.

## Next Move

Ship the `0.8` Chrome Web Store gate:

- toolbar icon and popup identity stay tied to the active bot
- background worker syncs bot identity from the local daemon without requiring the popup to open first
- popup, background, and context menu call the same daemon function shape
- stale token, unpaired, daemon offline, and empty page failures recover cleanly
- store package validates MV3, permissions, local-only host permissions, scripts, popup, and icons

## Proof

```powershell
corepack pnpm --filter @clawdbot/extension build
corepack pnpm fixture:extension-skill
corepack pnpm extension:store-package
```

## Caveat

The extension must never store model credentials, invent pairing state, or send page content anywhere except the local daemon. The public privacy policy URL is blocked until a GitHub remote exists.
