# SUPERIOR Contract Fixtures

Fixtures prove that a host speaks the SUPERIOR local contract. They are not tied to the Tauri harness.

Current runners:

- `run-host-contract-fixture.mjs`: host-agnostic shape and recovery proof for Node now and future native hosts.
- `run-spore-ownership-fixture.mjs`: one-spore investor proof that saves Clawd, pairs the Chrome hand, proves the icon identity, runs Article X-Ray, and records the bot reaction.
- `run-extension-skill-fixture.mjs`: paired extension-style browser skill proof.
- `run-native-loop-fixture.mjs`: repo URL to saved workspace to playpen pairing to Article X-Ray proof.
- `run-mobile-companion-fixture.mjs`: mobile-safe companion proof that runs a secret browser-page result, then confirms `GET /mobile-companion` exposes identity/status/asset data without pairing tokens, page text, URL secrets, local state paths, or model key names.
- `run-supabase-account-fixture.mjs`: isolated account/spore continuity proof that checks Supabase source boundaries, seeds Google/X/Discord account state beside a local spore, and confirms sign-out does not delete the local bot.

Run the local proof fixtures:

```powershell
corepack pnpm fixture:host-contract
corepack pnpm fixture:spore-ownership
corepack pnpm fixture:extension-skill
corepack pnpm fixture:native-loop
corepack pnpm fixture:mobile-companion
corepack pnpm fixture:supabase-account
```

`fixture:spore-ownership` intentionally leaves the machine in the demo state by default: `Clawd / Gremlin / Moss Green / Pixel Eye / Article X-Ray`. Add `--restore-original` or `--reset-pairing` when running the script directly if you want cleanup behavior.

`fixture:mobile-companion` starts a temporary daemon with isolated state by default, so it is safe to run without disturbing the local Workshop. Pass `--host http://127.0.0.1:5317` when validating an already-running host.

`fixture:supabase-account` starts a temporary daemon with isolated state by default. It does not call live Supabase; fake Supabase URL, publishable key, access token, and pairing token sentinels prove those values do not leak through setup, mobile companion, or portable spore output.

`fixture:native-loop` also starts a temporary daemon with isolated state by default. Pass `--host http://127.0.0.1:5317` when validating the installed or manually started daemon instead of the fixture-owned daemon.

Run the current native Windows proof gate:

```powershell
corepack pnpm windows:proof
```

This compiles the WPF lane, smoke-launches the EXE, and then proves the host contract shape. Use this before calling a native Windows slice done.

Run against a future native host:

```powershell
node tools/contract-fixtures/run-host-contract-fixture.mjs --host http://127.0.0.1:5317
node tools/contract-fixtures/run-native-loop-fixture.mjs --host http://127.0.0.1:5317
node tools/contract-fixtures/run-mobile-companion-fixture.mjs --host http://127.0.0.1:5317
```
