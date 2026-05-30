# SUPERIOR Hub

Private Vercel coordination surface for release proof, platform status, artifacts, and agent packets.

This is not the robot runtime. Do not put OpenAI keys, pairing tokens, local repo workspace state, browser profile data, or user logs in this app.

Run locally:

```powershell
corepack pnpm --filter @clawdbot/hub build
```

Deploy preview:

```powershell
vercel --cwd apps/hub --yes
```

Protect the project with Vercel Authentication before sharing proof links outside the local machine:

```powershell
vercel project protection enable --sso --cwd apps/hub --non-interactive
vercel project protection --cwd apps/hub --format json
```

Use protected deployment URLs for proof. Do not rely on public production aliases unless the Vercel plan protects all deployments.
