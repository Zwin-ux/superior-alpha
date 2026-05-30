# Private Hub Packet

## Goal

Keep the private Vercel hub as an internal proof mirror. GitHub is the main public hub.

## Next Move

Keep the mirror static and public-safe:

- no local secrets
- no local browser profile data
- no pairing tokens
- no private repo workspace state
- artifact links point back to GitHub Releases when a remote exists

## Proof

```powershell
corepack pnpm --filter @clawdbot/hub build
vercel --cwd apps/hub --yes
vercel project protection enable --sso --cwd apps/hub --non-interactive
```

## Caveat

The hub is not the product homepage, hosted robot runtime, or source of truth. It mirrors proof; it does not run skills.

Use protected deployment URLs for proof. Standard Vercel Authentication may leave production aliases public, so remove aliases or upgrade protection before sharing sensitive alpha evidence.
