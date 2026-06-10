# SUPERIOR

<p align="center">
  <img src="assets/github/alpha-stamp.svg" alt="Alpha 1" width="360">
</p>

SUPERIOR is a local AI companion and signal-analysis console with a tactile clay UI. It pairs a Godot desktop environment with a Chrome extension to create a privacy-first bot that lives on your machine.

## One-Click Install (Windows)

[**Download Alpha 1 Installer (.exe)**](https://github.com/Zwin-ux/superior-alpha/releases/download/v0.19.0-alpha.1/SUPERIOR-Alpha-1-Installer.exe)

## Platforms

| Windows | Chrome Extension | macOS |
| --- | --- | --- |
| ![Windows alpha](assets/github/platform-windows.svg) | ![Chrome extension](assets/github/platform-chrome.svg) | ![macOS planned](assets/github/platform-mac.svg) |
| [Download EXE](https://github.com/Zwin-ux/superior-alpha/releases/download/v0.19.0-alpha.1/SUPERIOR-Alpha-1-Installer.exe) | [Download ZIP](https://github.com/Zwin-ux/superior-alpha/releases) | Planned |

## What it is

- **Tactile workshop** — a hand-built clay world in Godot where your bot lives. Buttons are clay slabs. Status is lights, stamps, and physical reactions.
- **Browser companion** — the Chrome extension connects browser signals into your bot's awareness, giving it a window into your tabs, activity, and flow.
- **Privacy-first** — everything runs locally. Your bot daemon, your machine, your data.
- **Real-time monitors** — hardware sensors and spinning data spools feed into the bot's perception.
- **Spore Wake onboarding** — the boot ritual that pairs and awakens your bot. No accounts, no cloud.

## Architecture

```
superior/
  godot-client/    # Primary runtime — clay workshop, avatar, engine
  apps/
    desktop/       # Tauri/React alpha harness
    windows/       # Native Windows product lane
    extension/     # Chrome browser hand
    hub/           # Project status surface
  packages/
    shared/        # Cross-boundary contracts
    core/          # Bot logic and state core
```

## Getting started

1. Download and run the `SUPERIOR-Alpha-1-Installer.exe`
2. Follow the in-engine **Spore Wake** ritual to set up your bot
3. Connect the Chrome extension to link your browser signals

## Local development

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm dev
```

Requires Node.js >=22 with `corepack` enabled.

## Verification

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

[Issue Tracker](https://github.com/Zwin-ux/superior-alpha/issues) | [Privacy Policy](docs/extension-privacy.md)
