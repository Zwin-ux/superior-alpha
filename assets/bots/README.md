# Bot Asset Direction

Bot assets should read as handmade clay pieces, not generic mascot vectors.

## Reference Boards

- `clawdbot-workshop-key-art.png`: finished scene target for clay lighting, menu slabs, workbench scale, and parts tray density.
- `clawdbot-clay-asset-sheet.png`: bot variants, skill attachments, pigment palette, and tiny icon targets.
- `clawdbot-launcher-window-reference.png`: old PC launcher framing reference with clay controls and workshop props.
- `repo-reader-gear-placeholder.svg`: temporary tiny clay gear for the runnable Repo Reader side slot.
- `soul/clawdbot-workshop-target.png`: current soul brief workshop target composition.
- `soul/clawd-hermes-avatar.png`: clean-install Clawd/Hermes avatar source.
- `soul/clawd-hermes-multiplatform-icons.png`: one-spore-many-shells platform icon direction.

Generated text in these images is reference only. Final labels must come from Figma/code.

## Soul Asset Shelf

The `soul/` shelf came from `clawdbot_codex_soul_brief` and is now the default cross-platform identity source.

- `soul/icons/clawd-windows.ico`: Windows app, installer, and taskbar icon.
- `soul/icons/chrome-extension-icon-16.png`, `32.png`, `48.png`, `128.png`: Chrome static manifest icons.
- `soul/icons/clawd-windows-256.png`: large Windows/desktop fallback icon.
- `soul/icons/clawd-macos-1024.png`: macOS starter icon.
- `soul/icons/clawd-pwa-512.png`: web/PWA starter icon.
- `soul/icons/clawd-mobile-512.png`: future mobile starter icon.
- `soul/icons/clawd-daemon-64.png`: daemon/CLI status mark.

Runtime customized icons can still be generated from `BotIdentity`; these assets set the clean-install face.

## 0.3 Runtime Shelf

- `0.3/workshop-key-art.png`: canonical desktop composition target.
- `0.3/clay-asset-sheet.png`: canonical body, part, pigment, and icon target.
- `0.3/asset-manifest.json`: runtime lookup notes for app surfaces.
- `0.3/generated/backgrounds/`: generated workshop, menu rail, tray, and table textures.
- `0.3/generated/buttons/`: generated menu slab states.
- `0.3/generated/panels/`: generated raised and pressed clay surfaces.

The desktop Vite app mirrors the 0.3 PNG references and generated surfaces into `apps/desktop/public/assets/bots/0.3/` so CSS can load them without changing the monorepo asset source of truth.

Run `node assets/bots/0.3/scripts/generate-clay-ui-assets.mjs` after changing generated background, button, or panel assets. The script writes both the source shelf and the desktop runtime mirror.

## Bodies

- `Core`: round clay head, friendly dot eyes, slow bounce.
- `Scanner`: large clay lens, soft scan glow, handmade wobble.
- `Sentinel`: rounded helmet, stamped shield mark, restrained shield pulse.
- `Gremlin`: asymmetrical clay head, uneven antenna, tiny side gear.
- `Orb`: smooth clay sphere, subtle internal glow, soft hover.

## Pigments

- Sky Blue
- Moss Green
- Brick Red
- Sun Gold
- Lavender
- Chalk White
- Charcoal

## Attachments

- Feed X-Ray -> clay lens ring
- Repo Reader -> tiny clay gear
- Dark Pattern Scanner -> clay shield badge
- Job Scanner -> clay badge or stamp
- Page Explainer -> tiny clay paper tab
- Article X-Ray -> pressed clay lens ring
- Transcript Lens -> tiny caption reel
- AI Pattern Detector -> stamped checker badge
- Change Sentinel -> clay alarm bead
- Prediction Pulse -> Sun Gold pulse coin
- Market Lane Scout -> clay lane flag
- Crew Signal -> tiny crew radio

## Motion Notes

- Slow idle bounce
- Organic blink timing
- Slight head tilt delay
- Antenna wiggle for Gremlin
- Button and attachment squash on interaction
