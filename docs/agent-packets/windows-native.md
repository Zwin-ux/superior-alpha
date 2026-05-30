# Windows Native Packet

## Goal

Make the `.NET` Windows EXE the flagship surface.

## Next Move

Finish native bot creation:

- make `New Bot` open setup mode
- fetch `Clawd`, `Hermes`, and `Mote` from `/bot-presets`
- show setup state from `/setup-state`
- let the user rename, pick body/color/eye, and equip runnable skills
- save one active bot through `/bot-identity`
- prove extension/icon/playpen identity still follows the saved bot

## Proof

```powershell
corepack pnpm fixture:host-contract
corepack pnpm windows:proof
```

## Caveat

0.9 is one active bot only. Starter presets are seeds, not save slots.
