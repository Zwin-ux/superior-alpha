# SUPERIOR Contract Fixtures

Fixtures prove that a host speaks the SUPERIOR local contract. They are not tied to the Tauri harness.

Current runners:

- `run-host-contract-fixture.mjs`: host-agnostic shape and recovery proof for Node now and future native hosts.
- `run-extension-skill-fixture.mjs`: paired extension-style browser skill proof.
- `run-native-loop-fixture.mjs`: repo URL to saved workspace to playpen pairing to Article X-Ray proof.

Run against the default local daemon:

```powershell
corepack pnpm fixture:host-contract
corepack pnpm fixture:extension-skill
corepack pnpm fixture:native-loop
```

Run the current native Windows proof gate:

```powershell
corepack pnpm windows:proof
```

This compiles the WPF lane, smoke-launches the EXE, and then proves the host contract shape. Use this before calling a native Windows slice done.

Run against a future native host:

```powershell
node tools/contract-fixtures/run-host-contract-fixture.mjs --host http://127.0.0.1:5317
```
