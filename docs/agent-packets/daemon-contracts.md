# Daemon And Contracts Packet

## Goal

Keep the local daemon as the current robot brain while making the host contract portable to `.NET`.

## Next Move

Expand host fixtures before porting more backend behavior:

- browser pairing start, complete, reset
- paired and unpaired browser function calls
- SUPERIOR Browser start, events, inspect, stop
- custom JS/TS skill import proposal
- missing-key model path

## Proof

```powershell
corepack pnpm fixture:host-contract
corepack pnpm test
```

## Caveat

Do not port route code line-by-line into `.NET`. Port contracts and behavior.
