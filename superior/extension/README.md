# SUPERIOR Extension Lane

The existing MV3 build still lives in `apps/extension`.

This lane defines the engine-facing role:

- capture browser signals only after user action or controlled playpen attach
- forward events to the local daemon/server boundary
- keep the user's active avatar identity in the toolbar icon
- never store OpenAI keys, cookies, or private server secrets

Future work should bridge extension events into `superior/server` as `browser` signals.
