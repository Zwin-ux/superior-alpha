# Native Loop Packet

## Goal

Make the official `.NET` Windows app prove the robot loop without the Tauri harness.

## Next Move

Keep the native loop tight:

- GitHub repo URL input
- native Repo Reader result
- saved workspace state
- Start Playpen
- controlled profile pairing
- Article X-Ray proof
- Stop

## Proof

```powershell
corepack pnpm windows:native-loop-smoke
corepack pnpm fixture:native-loop
```

## Caveat

The proof still uses the Node daemon as the local brain. Do not start a hosted runtime or port route code into `.NET` until host fixtures are broader.
