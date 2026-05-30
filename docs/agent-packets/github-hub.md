# GitHub Hub Packet

## Goal

Make GitHub the main public hub for SUPERIOR alpha.

## Next Move

Keep the repo front door visual and direct:

- README leads with `ALPHA BUILD`, workshop art, and platform cards
- product explanation stays to two sentences
- Windows, Chrome, and macOS lanes are shown with SVG platform icons
- artifacts point to GitHub Releases once a remote exists
- privacy policy URL points to the public GitHub doc
- privacy policy and Chrome listing docs live in repo docs
- no generic landing page, no feature-card grid, no long pitch copy

## Proof

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm extension:store-package
```

## Caveat

The public repo is `https://github.com/Zwin-ux/superior-alpha`. Chrome Web Store upload and review still happen manually in the Developer Dashboard.
