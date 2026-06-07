# Clawdbot (SUPERIOR) Project Guidelines

## Overview
Clawdbot is a claymation desktop game utility. It is a pnpm monorepo using TypeScript, Godot (visual engine), and Node.js (daemon).

## Architecture
- `superior/core`: Shared event contracts and state reducers.
- `superior/godot-client`: Primary visual runtime.
- `superior/server`: Realtime backend.
- `apps/daemon`: Node/TS background process for local coordination.
- `apps/windows`: Native .NET app for packaging/service proof.
- `apps/extension`: Chrome/Edge MV3 browser extension.
- `packages/shared`: Common types and contracts.

## Engineering Rules
- **Contracts First:** Data crossing app boundaries must use typed request/result/error shapes in `packages/shared`.
- **Privacy:** Daemon routes should protect privacy boundaries.
- **Deterministic First:** Prefer deterministic local skill behavior before model-backed behavior.
- **Simplicity:** Do not add abstractions unless they protect privacy, compatibility, or handle real complexity.
- **Documentation:** Use `AGENTS.md` for workspace notes and `GEMINI.md` (this file) for shared conventions.

## Development Workflow
- **Install:** `corepack pnpm install`
- **Validation:** `corepack pnpm typecheck && corepack pnpm test && corepack pnpm build`
- **Local Dev:** `corepack pnpm dev` (runs daemon and desktop)

## UI & Taste
- Look and feel: Matte, pressed, squished, handmade clay.
- Bot is the primary explanation surface; avoid big UI text blocks.
- Skills are "loadout equipment" (Eye, Crown, Side, Badge, Charm).

## QA
Always run typecheck, test, and build before committing or completing tasks.
