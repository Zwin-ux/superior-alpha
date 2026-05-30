# SUPERIOR Chrome Web Store Packet

Target release: `0.8.0` public listing

## Listing

- Name: `SUPERIOR`
- Category: `Productivity`
- Short description: `A clay robot browser hand for local page skills from the SUPERIOR desktop app.`
- Single purpose: SUPERIOR captures the current page on user command and sends it to the user's local SUPERIOR desktop daemon so the selected robot skill can run.
- Privacy policy source: `docs/extension-privacy.md`
- Privacy policy public URL: use the GitHub-hosted URL for `docs/extension-privacy.md` after a remote repository is configured.

## Permission Rationale

- `activeTab`: capture the current page only after the user clicks the popup or context-menu action.
- `contextMenus`: add `Explain with SUPERIOR` and `Article X-Ray with SUPERIOR` right-click actions.
- `scripting`: run a one-shot page capture script in the active tab after user action.
- `storage`: keep the local pairing token and active bot identity for icon/popup consistency.
- `tabs`: report active tab URL/title to the local daemon after pairing and playpen use.
- `http://127.0.0.1:5317/*`, `http://localhost:5317/*`: talk only to the local SUPERIOR daemon and robot-owned browser session pages.

## Data Declaration

- Page content is captured only for user-triggered skills or a SUPERIOR-controlled playpen session.
- Captured content is sent to the local daemon, not a SUPERIOR hosted service.
- OpenAI key stays in the desktop app's local state and never enters extension storage.
- No analytics, ads, tracking, sale of data, or cross-site profiling.

## Screenshots To Capture

- Extension popup paired to the local app with the clay robot visible.
- Toolbar icon matching the active robot identity.
- Context menu showing `Explain with SUPERIOR` and `Article X-Ray with SUPERIOR`.
- Native SUPERIOR app showing Browser Link or playpen state beside the same robot.

## Store Package Proof

Build the Chrome Web Store packet:

```powershell
corepack pnpm extension:store-package
```

Expected artifact:

```text
.clawdbot/artifacts/extension/SUPERIOR-0.8.0-chrome-mv3.zip
```

The package validator checks MV3, exact permissions, local-only host permissions, required scripts, popup, and icon sizes.

## Manual Review Checklist

- Load the built extension in Chrome.
- Change the robot in native SUPERIOR.
- Confirm the toolbar icon updates without reopening the popup.
- Open the popup and confirm the visible bot and favicon match the toolbar icon.
- Pair the extension and run Article X-Ray.
- Confirm stale token, daemon offline, and unpaired states recover without exposing the OpenAI key.
- Confirm Chrome extension storage contains only pairing and bot identity state.
