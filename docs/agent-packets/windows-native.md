# Windows Native Packet

## Goal

Make the `.NET` Windows EXE the flagship surface.

## Next Move

Finish the installed Windows loop:

- build the native MSI
- launch installed WPF without Vite or repo checkout
- save the OpenAI key from the native tray
- start the packaged daemon with packaged Node and MV3 extension resources
- prove Repo Reader -> Start Playpen -> Article X-Ray -> Stop

## Proof

```powershell
corepack pnpm windows:msi
corepack pnpm windows:installed-loop-smoke
```

## Caveat

0.7 is your-machine proof first. Wider Beta still needs a second Windows user/machine pass.
