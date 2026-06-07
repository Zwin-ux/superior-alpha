import { SuperiorSignalKind } from "@clawdbot/shared";

const DEFAULT_SERVER_PORT = 7357;
const SUPERIOR_SERVER_URL = `http://127.0.0.1:${process.env.SUPERIOR_SERVER_PORT ?? DEFAULT_SERVER_PORT}/signals`;

export async function emitSuperiorSignal(kind: SuperiorSignalKind, label: string, intensity = 1, detail?: string): Promise<void> {
  try {
    await fetch(SUPERIOR_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        kind,
        label,
        intensity,
        source: "daemon",
        ...(detail ? { detail } : {})
      })
    });
  } catch (error) {
    // Silently fail if the realtime server is not running
    // This prevents agent actions from crashing if the visual engine is closed
  }
}
