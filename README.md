# SUPERIOR

<p align="center">
  <img src="assets/github/alpha-stamp.svg" alt="Alpha 1" width="360">
</p>

SUPERIOR is a local signal-analysis console and AI companion. It features a tactile clay UI built in Godot, a Chrome extension hand, and a local Node daemon.

System operations and agent tasks map to physical in-engine interactions—like a hardware monitor for real-time logs, spinning data spools, and mechanical switches.

## Platforms

| Windows | Chrome Extension | macOS |
| --- | --- | --- |
| ![Windows alpha](assets/github/platform-windows.svg) | ![Chrome extension](assets/github/platform-chrome.svg) | ![macOS planned](assets/github/platform-mac.svg) |
| Alpha 1 MSI | Alpha 1 ZIP | Planned |
| [Download MSI](https://github.com/Zwin-ux/superior-alpha/releases) | [Download ZIP](https://github.com/Zwin-ux/superior-alpha/releases) | |

## Local Development

Ensure you have Node.js >=22 and `corepack` enabled.

```powershell
# Install dependencies
corepack pnpm install

# Build workspace packages
corepack pnpm build

# Start local daemon and desktop environment
corepack pnpm dev
```

## Resources

- [Issue Tracker & Feedback](https://github.com/Zwin-ux/superior-alpha/issues)
- [Extension Privacy Policy](docs/extension-privacy.md)

---
*Note: Internal development documents, release ladders, and verification matrices are maintained in active sprint branches to keep the primary branch focused on the user experience.*
