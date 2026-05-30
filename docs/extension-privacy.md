# SUPERIOR Extension Privacy Policy

Last updated: 2026-05-30

SUPERIOR is a local-first desktop app plus Chrome extension. The extension is the browser hand for the local desktop robot.

## What The Extension Does

- Reads the current page only when the user clicks `Explain Page`, `Article X-Ray`, or a SUPERIOR context-menu action.
- Sends that captured page context to the local SUPERIOR daemon at `http://127.0.0.1:5317` or `http://localhost:5317`.
- Stores the local pairing token and active bot identity in Chrome extension storage so the toolbar icon and popup match the user's robot.
- Auto-pairs only inside a SUPERIOR-controlled local browser profile opened by the desktop app.

## What The Extension Does Not Do

- It does not store or receive the user's OpenAI API key.
- It does not send browser content to a SUPERIOR cloud service.
- It does not run analytics, ads, tracking pixels, or behavioral profiling.
- It does not read pages in the background without a user action or a SUPERIOR-controlled playpen session.
- It does not import cookies or credentials from the user's normal browser profile.

## Data Stored Locally

The extension may store:

- `clawdbotPairingToken`: local token issued by the SUPERIOR daemon.
- `clawdbotBotIdentity`: the user's selected robot name, body, color, eye, and equipped skills.

The local daemon may store recent function proof and repo playpen state on the user's machine. That data is not stored by the Chrome extension as a hosted service.

## Page Content

When a browser skill runs, the extension captures the active tab URL, title, selected text, and readable page text. It sends that payload to the local daemon so the desktop app can run the selected skill.

If the local daemon is configured with an OpenAI API key, the daemon may send the minimum needed skill request to OpenAI. The extension never sees or stores that key.

## Contact

Use the GitHub repository issues page for support once the public repository is configured.
