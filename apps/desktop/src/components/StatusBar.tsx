import { DaemonHealth, SuperiorSetupState } from "@clawdbot/shared";

export function StatusBar(props: {
  health: DaemonHealth | null;
  setupState: SuperiorSetupState | null;
  error: string | null;
}): React.ReactElement {
  const daemonStatus = props.error ? "offline" : props.health?.status ?? "offline";
  const keyStatus = props.health ? (props.health.openaiConfigured ? "OpenAI ready" : "OpenAI key missing") : "OpenAI offline";
  const browserStatus = props.health?.browserLinkState.status ?? "offline";
  const accountStatus = props.setupState?.account.handle ?? props.setupState?.account.status ?? "offline";

  return (
    <footer className="status-bar">
      <span>Daemon: {daemonStatus}</span>
      <span>Seal: {accountStatus}</span>
      <span>{keyStatus}</span>
      <span>Browser: {browserStatus}</span>
    </footer>
  );
}
