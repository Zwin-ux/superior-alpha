import { useEffect, useMemo, useState } from "react";
import {
  BotBody,
  BotColorId,
  BotEye,
  BotIdentity,
  CustomSkillImportProposal,
  DaemonHealth,
  RecentSkillResult,
  RepoWorkspaceRecord,
  RepoReaderResult,
  SkillId,
  SkillDefinition,
  SuperiorBrowserState,
  botBodies,
  botBodyCatalog,
  botEyeCatalog,
  botEyes,
  clayPigments,
  makeBotCssVars,
  runnableSkillShelf,
  skillCatalog,
  skillSlotLabels,
  skillSlots,
  updateBotIdentity
} from "@clawdbot/shared";
import { loadBotIdentity, saveBotIdentity } from "./botStorage";
import { ClayBot } from "./components/ClayBot";
import { LauncherMenu } from "./components/LauncherMenu";
import { StatusBar } from "./components/StatusBar";
import {
  DaemonLaunchResult,
  ensureLocalDaemon,
  fetchDaemonBotIdentity,
  fetchDaemonHealth,
  fetchRepoWorkspaceRecords,
  fetchRecentSkillResults,
  fetchSuperiorBrowserState,
  openExtensionFolder,
  openLocalFolder,
  requestCustomSkillImportProposal,
  requestRepoReader,
  resetBrowserPairing,
  saveDaemonBotIdentity,
  startBrowserPairing,
  startSuperiorBrowser,
  stopSuperiorBrowser
} from "./daemon";
import { updateFavicon } from "./favicon";

const menuItems = ["Continue", "New Bot", "Customize Bot", "Skills", "Browser Link", "Options", "Quit"] as const;
type MenuItem = (typeof menuItems)[number];

const skillRows = runnableSkillShelf;

export function App(): React.ReactElement {
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>("Continue");
  const [health, setHealth] = useState<DaemonHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [daemonLaunch, setDaemonLaunch] = useState<DaemonLaunchResult | null>(null);
  const [botIdentity, setBotIdentity] = useState(() => loadBotIdentity());
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [pairingCopied, setPairingCopied] = useState(false);
  const [customSkillFolderPath, setCustomSkillFolderPath] = useState("");
  const [customSkillProposal, setCustomSkillProposal] = useState<CustomSkillImportProposal | null>(null);
  const [customSkillError, setCustomSkillError] = useState<string | null>(null);
  const [customSkillBusy, setCustomSkillBusy] = useState(false);
  const [customSkillDropState, setCustomSkillDropState] = useState<"idle" | "hover" | "picked">("idle");
  const [repoReaderUrl, setRepoReaderUrl] = useState("");
  const [repoReaderResult, setRepoReaderResult] = useState<RepoReaderResult | null>(null);
  const [repoReaderError, setRepoReaderError] = useState<string | null>(null);
  const [repoReaderBusy, setRepoReaderBusy] = useState(false);
  const [repoWorkspaces, setRepoWorkspaces] = useState<RepoWorkspaceRecord[]>([]);
  const [superiorBrowserState, setSuperiorBrowserState] = useState<SuperiorBrowserState | null>(null);
  const [superiorBrowserBusy, setSuperiorBrowserBusy] = useState(false);
  const [superiorBrowserError, setSuperiorBrowserError] = useState<string | null>(null);
  const [recentResults, setRecentResults] = useState<RecentSkillResult[]>([]);

  const bot = useMemo(
    () =>
      updateBotIdentity(
        {
          ...botIdentity,
          browserLinkState: {
            status: health ? health.browserLinkState.status : "offline"
          }
        },
        {}
      ),
    [botIdentity, health]
  );
  const botStyle = useMemo(() => makeBotCssVars(bot), [bot]);
  const selectedRepoWorkspace = useMemo(
    () => (repoReaderResult ? findRepoWorkspaceForResult(repoWorkspaces, repoReaderResult) : null),
    [repoReaderResult, repoWorkspaces]
  );

  useEffect(() => {
    updateFavicon(bot);
  }, [bot]);

  useEffect(() => {
    let disposed = false;

    async function refresh(): Promise<void> {
      try {
        const [nextHealth, nextRecentResults, nextRepoWorkspaces, nextSuperiorBrowserState] = await Promise.all([
          fetchDaemonHealth(),
          fetchRecentSkillResults(),
          fetchRepoWorkspaceRecords(),
          fetchSuperiorBrowserState()
        ]);

        if (!disposed) {
          setHealth(nextHealth);
          setRecentResults(nextRecentResults.items);
          setRepoWorkspaces(nextRepoWorkspaces.items);
          setSuperiorBrowserState(nextSuperiorBrowserState);
          setHealthError(null);
        }
      } catch {
        if (!disposed) {
          setHealth(null);
          setSuperiorBrowserState(null);
          setHealthError("Daemon offline");
        }
      }
    }

    async function boot(): Promise<void> {
      try {
        const launch = await ensureLocalDaemon();

        if (!disposed && launch) {
          setDaemonLaunch(launch);
        }
      } catch {
        if (!disposed) {
          setDaemonLaunch({
            status: "failed",
            detail: "Desktop could not start the local daemon.",
            entry: null
          });
        }
      }

      await refresh();
    }

    void boot();
    const interval = window.setInterval(() => void refresh(), 6000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }

    void import("@tauri-apps/api/webview")
      .then(({ getCurrentWebview }) =>
        getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setSelectedMenu("Skills");
            setCustomSkillDropState("hover");
            return;
          }

          if (event.payload.type === "leave") {
            setCustomSkillDropState("idle");
            return;
          }

          const [folderPath] = event.payload.paths;

          if (!folderPath) {
            setCustomSkillDropState("idle");
            return;
          }

          setSelectedMenu("Skills");
          setCustomSkillDropState("picked");
          setCustomSkillFolderPath(folderPath);
          setCustomSkillProposal(null);
          setCustomSkillError(null);
          void scanCustomSkillFolder(folderPath);
        })
      )
      .then((nextUnlisten) => {
        if (disposed) {
          nextUnlisten();
          return;
        }

        unlisten = nextUnlisten;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function refreshBotIdentity(): Promise<void> {
      try {
        const daemonBot = await fetchDaemonBotIdentity();

        if (!disposed) {
          setBotIdentity(daemonBot);
          saveBotIdentity(daemonBot);
        }
      } catch {
        // The local preview can still customize while the daemon is offline.
      }
    }

    void refreshBotIdentity();

    return () => {
      disposed = true;
    };
  }, []);

  function commitBotIdentity(changes: Parameters<typeof updateBotIdentity>[1]): void {
    setBotIdentity((currentBot) => {
      const nextBot = updateBotIdentity(currentBot, changes);
      saveBotIdentity(nextBot);
      void saveDaemonBotIdentity(nextBot).catch(() => undefined);

      return nextBot;
    });
  }

  function toggleSkill(skillId: SkillId): void {
    setBotIdentity((currentBot) => {
      const hasSkill = currentBot.skills.includes(skillId);
      const targetSkill = skillCatalog[skillId];
      const skills = hasSkill
        ? currentBot.skills.filter((existingSkill) => existingSkill !== skillId)
        : [
            ...currentBot.skills.filter((existingSkill) => skillCatalog[existingSkill].slot !== targetSkill.slot),
            skillId
          ];
      const nextBot = updateBotIdentity(currentBot, {
        skills: skills.length > 0 ? skills : currentBot.skills
      });

      saveBotIdentity(nextBot);
      void saveDaemonBotIdentity(nextBot).catch(() => undefined);

      return nextBot;
    });
  }

  async function beginBrowserPairing(): Promise<void> {
    setPairingBusy(true);
    setPairingError(null);

    try {
      const result = await startBrowserPairing();
      setPairingToken(result.pairingToken);
      setPairingCopied(false);
      setHealth((currentHealth) =>
        currentHealth
          ? {
              ...currentHealth,
              browserLinkState: result.browserLinkState
            }
          : currentHealth
      );
    } catch {
      setPairingError("Daemon could not start browser pairing.");
    } finally {
      setPairingBusy(false);
    }
  }

  async function clearBrowserPairing(): Promise<void> {
    setPairingBusy(true);
    setPairingError(null);

    try {
      const result = await resetBrowserPairing();
      setPairingToken(null);
      setPairingCopied(false);
      setHealth((currentHealth) =>
        currentHealth
          ? {
              ...currentHealth,
              browserLinkState: result.browserLinkState
            }
          : currentHealth
      );
    } catch {
      setPairingError("Daemon could not reset browser pairing.");
    } finally {
      setPairingBusy(false);
    }
  }

  async function copyPairingToken(): Promise<void> {
    if (!pairingToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pairingToken);
      setPairingCopied(true);
      window.setTimeout(() => setPairingCopied(false), 1600);
    } catch {
      setPairingError("Select the token and copy it manually.");
    }
  }

  async function scanCustomSkillFolder(folderPathOverride?: string): Promise<void> {
    const folderPath = (folderPathOverride ?? customSkillFolderPath).trim();

    if (!folderPath) {
      setCustomSkillProposal(null);
      setCustomSkillError("Choose a JS/TS project folder first.");
      return;
    }

    setCustomSkillBusy(true);
    setCustomSkillError(null);
    setCustomSkillFolderPath(folderPath);

    try {
      const proposal = await requestCustomSkillImportProposal(folderPath);
      setCustomSkillProposal(proposal);
      setCustomSkillFolderPath(proposal.sourceFolder);
      setCustomSkillDropState("picked");
    } catch (error) {
      setCustomSkillProposal(null);
      setCustomSkillError(error instanceof Error ? error.message : "Custom skill scan failed.");
    } finally {
      setCustomSkillBusy(false);
    }
  }

  async function readGithubRepo(): Promise<void> {
    const repoUrl = repoReaderUrl.trim();

    if (!repoUrl) {
      setRepoReaderResult(null);
      setRepoReaderError("Paste a GitHub repo link.");
      return;
    }

    setRepoReaderBusy(true);
    setRepoReaderError(null);
    setRepoReaderUrl(repoUrl);

    try {
      const result = await requestRepoReader(repoUrl, bot);

      setRepoReaderResult(result);
      setRepoReaderUrl(result.source.url);
      setRecentResults((items) => [
        {
          type: "recent-skill-result",
          id: `recent_${result.requestId}`,
          requestId: result.requestId,
          skillId: "repo-reader",
          skillLabel: "Repo Reader",
          source: result.source,
          summary: result.summary,
          detail: `${result.playground.label} / ${result.environment.mode}`,
          status: result.risks.some((risk) => risk !== "No obvious first-pass risk.") ? "warning" : "ready",
          createdAt: result.createdAt
        },
        ...items.filter((item) => item.requestId !== result.requestId)
      ]);

      const workspaces = await fetchRepoWorkspaceRecords().catch(() => null);

      if (workspaces) {
        setRepoWorkspaces(workspaces.items);
      }
    } catch (error) {
      setRepoReaderResult(null);
      setRepoReaderError(error instanceof Error ? error.message : "Repo Reader failed.");
    } finally {
      setRepoReaderBusy(false);
    }
  }

  async function startRepoPlaypen(repoWorkspaceId: string | null): Promise<void> {
    if (!repoWorkspaceId) {
      setSuperiorBrowserError("Read this repo first.");
      return;
    }

    setSuperiorBrowserBusy(true);
    setSuperiorBrowserError(null);

    try {
      const result = await startSuperiorBrowser(repoWorkspaceId, bot);

      setSuperiorBrowserState(result.state);
      setHealth((currentHealth) =>
        currentHealth
          ? {
              ...currentHealth,
              browserLinkState: {
                status: result.state.status === "paired" ? "paired" : currentHealth.browserLinkState.status
              }
            }
          : currentHealth
      );
    } catch (error) {
      setSuperiorBrowserError(error instanceof Error ? error.message : "SUPERIOR Browser could not start.");
    } finally {
      setSuperiorBrowserBusy(false);
    }
  }

  async function stopRepoPlaypen(): Promise<void> {
    setSuperiorBrowserBusy(true);
    setSuperiorBrowserError(null);

    try {
      const result = await stopSuperiorBrowser();

      setSuperiorBrowserState(result.state);
    } catch (error) {
      setSuperiorBrowserError(error instanceof Error ? error.message : "SUPERIOR Browser could not stop.");
    } finally {
      setSuperiorBrowserBusy(false);
    }
  }

  return (
    <main className="workshop-shell" style={botStyle}>
      <div className="workshop-window">
        <aside className="menu-rail" aria-label="SUPERIOR menu">
          <div className="brand-block">
            <span className="brand-mark" aria-hidden="true" />
            <h1>SUPERIOR</h1>
          </div>
          <LauncherMenu items={menuItems} selectedItem={selectedMenu} onSelect={setSelectedMenu} />
        </aside>

        <section className="workbench" aria-label="SUPERIOR workshop">
          <div className="scene-light" aria-hidden="true" />
          <div className="shelf-line" aria-hidden="true" />
          <ClayBot bot={bot} />
          <section className="workbench-panel" aria-label="Bot setup">
            <div>
              <p className="panel-kicker">CREATE BOT</p>
              <h2>{bot.name}</h2>
            </div>
            <div className="setup-grid">
              <SetupCell label="Body" value={bot.body} />
              <SetupCell label="Color" value={clayPigments[bot.color].label} />
              <SetupCell label="Eye" value={bot.eye} />
              <SetupCell label="Browser" value={health ? health.browserLinkState.status : "offline"} />
            </div>
          </section>
        </section>

        <aside className="activity-panel" aria-label="Current status">
          <section>
            <h2>{selectedMenu}</h2>
            <p>{getPanelCopy(selectedMenu)}</p>
          </section>
          {selectedMenu === "Continue" ? (
            <>
              <StatusOverviewPanel health={health} healthError={healthError} daemonLaunch={daemonLaunch} />
              <RecentList items={recentResults} />
            </>
          ) : null}
          {selectedMenu === "Browser Link" ? (
            <BrowserLinkPanel
              health={health}
              pairingBusy={pairingBusy}
              pairingError={pairingError}
              pairingToken={pairingToken}
              pairingCopied={pairingCopied}
              superiorBrowserState={superiorBrowserState}
              superiorBrowserBusy={superiorBrowserBusy}
              superiorBrowserError={superiorBrowserError}
              onStartPairing={() => void beginBrowserPairing()}
              onResetPairing={() => void clearBrowserPairing()}
              onCopyToken={() => void copyPairingToken()}
              onStopPlaypen={() => void stopRepoPlaypen()}
            />
          ) : null}
          {selectedMenu === "Skills" ? (
            <>
              <section className="parts-tray">
                <h3>Equipped Parts</h3>
                <LoadoutPanel bot={bot} label="Slots" />
              </section>
              <RepoReaderPanel
                repoUrl={repoReaderUrl}
                result={repoReaderResult}
                repoWorkspace={selectedRepoWorkspace}
                superiorBrowserState={superiorBrowserState}
                superiorBrowserBusy={superiorBrowserBusy}
                superiorBrowserError={superiorBrowserError}
                error={repoReaderError}
                busy={repoReaderBusy}
                onRepoUrlChange={setRepoReaderUrl}
                onReadRepo={() => void readGithubRepo()}
                onStartPlaypen={() => void startRepoPlaypen(selectedRepoWorkspace?.id ?? null)}
                onStopPlaypen={() => void stopRepoPlaypen()}
              />
              <CustomSkillImportPanel
                folderPath={customSkillFolderPath}
                proposal={customSkillProposal}
                error={customSkillError}
                busy={customSkillBusy}
                dropState={customSkillDropState}
                onFolderPathChange={setCustomSkillFolderPath}
                onScan={() => void scanCustomSkillFolder()}
              />
              <SkillList bot={bot} />
            </>
          ) : null}
          {selectedMenu === "New Bot" || selectedMenu === "Customize Bot" ? (
            <section className="parts-tray">
              <h3>Clay Parts Tray</h3>
              <CustomizationPanel
                bot={bot}
                onBodyChange={(body) => commitBotIdentity({ body })}
                onColorChange={(color) => commitBotIdentity({ color })}
                onEyeChange={(eye) => commitBotIdentity({ eye })}
                onToggleSkill={toggleSkill}
              />
            </section>
          ) : null}
          {selectedMenu === "Options" ? (
            <OptionsPanel health={health} healthError={healthError} daemonLaunch={daemonLaunch} />
          ) : null}
          {selectedMenu === "Quit" ? <QuitPanel /> : null}
        </aside>
      </div>
      <StatusBar health={health} error={healthError} />
    </main>
  );
}

function StatusOverviewPanel(props: {
  health: DaemonHealth | null;
  healthError: string | null;
  daemonLaunch?: DaemonLaunchResult | null;
}): React.ReactElement {
  const browserStatus = props.health?.browserLinkState.status ?? "offline";
  const openaiStatus = props.health?.openaiConfigured ? "ready" : props.health ? "missing key" : "offline";
  const launchTone = props.daemonLaunch
    ? props.daemonLaunch.status === "started" || props.daemonLaunch.status === "already-running"
      ? "ready"
      : props.daemonLaunch.status === "starting"
        ? "warn"
        : "bad"
    : "warn";
  const launchValue = props.daemonLaunch ? getDaemonLaunchLabel(props.daemonLaunch.status) : null;

  return (
    <section className="status-overview" aria-label="Local status">
      <StatusRow label="Daemon" value={props.healthError ? "offline" : props.health?.status ?? "checking"} tone={props.health ? "ready" : "bad"} />
      {launchValue ? <StatusRow label="Launch" value={launchValue} tone={launchTone} /> : null}
      <StatusRow label="OpenAI" value={openaiStatus} tone={props.health?.openaiConfigured ? "ready" : "warn"} />
      <StatusRow label="Browser" value={browserStatus} tone={browserStatus === "paired" ? "ready" : browserStatus === "offline" ? "bad" : "warn"} />
    </section>
  );
}

function StatusRow(props: { label: string; value: string; tone: "ready" | "warn" | "bad" }): React.ReactElement {
  return (
    <div className="status-row" data-tone={props.tone}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function getDaemonLaunchLabel(status: DaemonLaunchResult["status"]): string {
  switch (status) {
    case "already-running":
      return "running";
    case "started":
      return "started";
    case "starting":
      return "starting";
    case "missing-node":
      return "missing node";
    case "missing-entry":
      return "missing runtime";
    case "failed":
    default:
      return "failed";
  }
}

function RecentList(props: { items: RecentSkillResult[] }): React.ReactElement {
  return (
    <section className="recent-list">
      <h3>Recent</h3>
      {props.items.length > 0 ? (
        props.items.map((item) => <RecentResultRow key={item.id} item={item} />)
      ) : (
        <p>No browser runs yet.</p>
      )}
    </section>
  );
}

function RecentResultRow(props: { item: RecentSkillResult }): React.ReactElement {
  return (
    <article className="recent-result-row" data-status={props.item.status}>
      <div>
        <span>{props.item.skillLabel}</span>
        <strong>{props.item.source.title || "Untitled page"}</strong>
      </div>
      <p>{props.item.summary}</p>
      <em>{props.item.detail}</em>
    </article>
  );
}

function SkillList(props: { bot: BotIdentity }): React.ReactElement {
  return (
    <section className="skill-list">
      <h3>Superior Skill Cabinet</h3>
      {skillRows.map((skill) => (
        <SkillRow key={skill.id} skill={skill} equipped={props.bot.skills.includes(skill.id)} />
      ))}
    </section>
  );
}

function OptionsPanel(props: {
  health: DaemonHealth | null;
  healthError: string | null;
  daemonLaunch: DaemonLaunchResult | null;
}): React.ReactElement {
  const [openFolderStatus, setOpenFolderStatus] = useState<string | null>(null);
  const localConfig = props.health?.localConfig;

  async function openKeyFolder(): Promise<void> {
    if (!localConfig) {
      return;
    }

    setOpenFolderStatus("Opening...");

    try {
      const result = await openLocalFolder(localConfig.stateDirectory);

      setOpenFolderStatus(result?.status === "opened" ? "Folder opened." : "Use the path below.");
    } catch {
      setOpenFolderStatus("Use the path below.");
    }
  }

  return (
    <section className="options-panel" aria-label="Local options">
      <h3>Local Runtime</h3>
      <StatusOverviewPanel health={props.health} healthError={props.healthError} daemonLaunch={props.daemonLaunch} />
      <StatusRow
        label="Key file"
        value={localConfig ? getKeyFileLabel(localConfig.keyFilePresent, props.health?.openaiConfigured ?? false) : "unknown"}
        tone={props.health?.openaiConfigured ? "ready" : "warn"}
      />
      {localConfig ? (
        <div className="key-folder-panel">
          <span>Key Folder</span>
          <code title={localConfig.keyFilePath}>{localConfig.keyFilePath}</code>
          <button className="choice-chip service-action" type="button" onClick={() => void openKeyFolder()}>
            Open Folder
          </button>
          {openFolderStatus ? <p>{openFolderStatus}</p> : null}
        </div>
      ) : (
        <p>Local files only.</p>
      )}
    </section>
  );
}

function getKeyFileLabel(keyFilePresent: boolean, openaiConfigured: boolean): string {
  if (openaiConfigured) {
    return "ready";
  }

  return keyFilePresent ? "check key" : "missing";
}

function QuitPanel(): React.ReactElement {
  return (
    <section className="options-panel" aria-label="Quit note">
      <h3>Workshop Window</h3>
      <p>Close from the app window.</p>
    </section>
  );
}

function RepoReaderPanel(props: {
  repoUrl: string;
  result: RepoReaderResult | null;
  repoWorkspace: RepoWorkspaceRecord | null;
  superiorBrowserState: SuperiorBrowserState | null;
  superiorBrowserBusy: boolean;
  superiorBrowserError: string | null;
  error: string | null;
  busy: boolean;
  onRepoUrlChange: (repoUrl: string) => void;
  onReadRepo: () => void;
  onStartPlaypen: () => void;
  onStopPlaypen: () => void;
}): React.ReactElement {
  const surfaces = props.result?.presentation.surfaces.map(formatRepoSurface) ?? [];
  const surfaceMap =
    props.result?.presentation.surfaceMap
      .slice(0, 4)
      .map((signal) => `${formatRepoSurface(signal.surface)}: ${signal.path} (${signal.confidence})`) ?? [];
  const playLoop = props.result?.playground.primaryLoop ?? [];
  const permissions = props.result?.playground.permissions.map(formatRepoPermission) ?? [];
  const environmentSteps = props.result?.environment.steps.slice(0, 4) ?? [];
  const risks = props.result?.risks.slice(0, 3) ?? [];
  const activeSession = props.superiorBrowserState?.activeSession;
  const activeForRepo = Boolean(props.repoWorkspace && activeSession?.repoWorkspaceId === props.repoWorkspace.id);
  const playpenStatus = activeForRepo ? props.superiorBrowserState?.status ?? "ready" : props.repoWorkspace ? "saved" : "read first";

  return (
    <section className="repo-reader-panel" aria-label="Repo Reader">
      <div className="custom-import-heading">
        <span>Repo Reader</span>
        <strong>Tiny clay gear</strong>
      </div>
      <form
        className="custom-import-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onReadRepo();
        }}
      >
        <input
          aria-label="GitHub repo link"
          value={props.repoUrl}
          onChange={(event) => props.onRepoUrlChange(event.target.value)}
          placeholder="https://github.com/owner/repo"
          spellCheck={false}
        />
        <button className="choice-chip service-action" type="submit" disabled={props.busy}>
          {props.busy ? "Reading..." : "Read Repo"}
        </button>
      </form>
      {props.error ? <p className="custom-import-error">{props.error}</p> : null}
      {props.result ? (
        <div className="repo-reader-result" aria-live="polite">
          <p>{props.result.summary}</p>
          <div className="proposal-grid">
            <SetupCell label="Playpen" value={props.result.playground.label} />
            <SetupCell label="Mode" value={props.result.environment.mode} />
            <SetupCell label="Presents" value={formatRepoSurface(props.result.presentation.primary)} />
            <SetupCell label="Stack" value={props.result.stack.slice(0, 2).join(", ") || "unknown"} />
          </div>
          <p className="repo-playground-role">{props.result.playground.robotRole}</p>
          <div className="repo-playpen-actions">
            <StatusRow
              label="Playpen"
              value={playpenStatus}
              tone={activeForRepo && props.superiorBrowserState?.status === "paired" ? "ready" : props.repoWorkspace ? "warn" : "bad"}
            />
            <div>
              <button
                className="choice-chip service-action"
                type="button"
                onClick={props.onStartPlaypen}
                disabled={props.superiorBrowserBusy || !props.repoWorkspace}
              >
                {props.superiorBrowserBusy && !activeForRepo ? "Starting..." : activeForRepo ? "Restart" : "Start Playpen"}
              </button>
              {activeForRepo ? (
                <button
                  className="choice-chip service-action"
                  type="button"
                  onClick={props.onStopPlaypen}
                  disabled={props.superiorBrowserBusy}
                >
                  {props.superiorBrowserBusy ? "Stopping..." : "Stop"}
                </button>
              ) : null}
            </div>
          </div>
          {props.superiorBrowserError ? <p className="custom-import-error">{props.superiorBrowserError}</p> : null}
          {surfaces.length > 0 ? <ProposalList label="Surfaces" items={surfaces} /> : null}
          {surfaceMap.length > 0 ? <ProposalList label="Found" items={surfaceMap} /> : null}
          {playLoop.length > 0 ? <ProposalList label="Robot Loop" items={playLoop} /> : null}
          {permissions.length > 0 ? <ProposalList label="Access" items={permissions} /> : null}
          {environmentSteps.length > 0 ? (
            <ProposalList
              label="Setup"
              items={environmentSteps.map((step) => step.command ?? `${step.label}: ${step.note}`)}
            />
          ) : null}
          {risks.length > 0 ? <ProposalList label="Risk" items={risks} tone="warning" /> : null}
        </div>
      ) : (
        <p className="custom-import-note">Paste a public GitHub repo. SUPERIOR picks the right playpen.</p>
      )}
    </section>
  );
}

function findRepoWorkspaceForResult(
  repoWorkspaces: RepoWorkspaceRecord[],
  result: RepoReaderResult
): RepoWorkspaceRecord | null {
  const id = `${result.repository.owner}/${result.repository.name}`.toLowerCase();

  return repoWorkspaces.find((repoWorkspace) => repoWorkspace.id === id) ?? null;
}

function formatRepoSurface(surface: RepoReaderResult["presentation"]["primary"]): string {
  const labels: Record<RepoReaderResult["presentation"]["primary"], string> = {
    "desktop-exe": "Desktop exe",
    "browser-extension": "Extension",
    "web-app": "Web app",
    "local-service": "Local service",
    cli: "CLI",
    library: "Library",
    monorepo: "Monorepo",
    docs: "Docs",
    unknown: "Unknown"
  };

  return labels[surface];
}

function formatRepoPermission(permission: RepoReaderResult["playground"]["permissions"][number]): string {
  const labels: Record<RepoReaderResult["playground"]["permissions"][number], string> = {
    "read-repo": "Read repo",
    "local-files": "Local files",
    terminal: "Terminal",
    "browser-control": "Own browser",
    "extension-control": "Extension",
    "service-control": "Local service"
  };

  return labels[permission];
}

function CustomSkillImportPanel(props: {
  folderPath: string;
  proposal: CustomSkillImportProposal | null;
  error: string | null;
  busy: boolean;
  dropState: "idle" | "hover" | "picked";
  onFolderPathChange: (folderPath: string) => void;
  onScan: () => void;
}): React.ReactElement {
  const scripts = props.proposal?.scripts.slice(0, 4) ?? [];
  const entrypoints = props.proposal?.entrypoints.slice(0, 4) ?? [];
  const warnings = props.proposal?.warnings ?? [];

  return (
    <section className="custom-import-panel" data-drop-state={props.dropState} aria-label="Custom skill import">
      <div className="custom-import-heading">
        <span>Custom Part</span>
        <strong>JS/TS Folder</strong>
      </div>
      <div className="custom-drop-target" data-drop-state={props.dropState}>
        <span className="drop-part-icon" aria-hidden="true" />
        <div>
          <strong>{getDropTargetLabel(props.dropState)}</strong>
          <span>{props.folderPath || "Metadata scan only."}</span>
        </div>
      </div>
      <form
        className="custom-import-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onScan();
        }}
      >
        <input
          aria-label="JS/TS folder path"
          value={props.folderPath}
          onChange={(event) => props.onFolderPathChange(event.target.value)}
          placeholder="C:\\Users\\...\\project"
          spellCheck={false}
        />
        <button className="choice-chip service-action" type="submit" disabled={props.busy}>
          {props.busy ? "Scanning..." : "Scan Folder"}
        </button>
      </form>
      {props.error ? <p className="custom-import-error">{props.error}</p> : null}
      {props.proposal ? (
        <div className="import-proposal" aria-live="polite">
          <div className="proposal-title">
            <span className="proposal-stamp">Proposal only</span>
            <strong>{props.proposal.suggestedSkill.label}</strong>
          </div>
          <div className="proposal-grid">
            <SetupCell label="Slot" value={skillSlotLabels[props.proposal.suggestedSkill.slot]} />
            <SetupCell label="Effect" value={props.proposal.suggestedSkill.effect} />
            <SetupCell label="Language" value={props.proposal.language} />
            <SetupCell label="Part" value={props.proposal.suggestedSkill.attachment} />
          </div>
          {scripts.length > 0 ? <ProposalList label="Scripts" items={scripts.map((script) => script.name)} /> : null}
          {entrypoints.length > 0 ? <ProposalList label="Entrypoints" items={entrypoints} /> : null}
          {warnings.length > 0 ? <ProposalList label="Warnings" items={warnings} tone="warning" /> : null}
        </div>
      ) : (
        <p className="custom-import-note">Scans metadata only. The part stays hidden until an adapter smoke run passes.</p>
      )}
    </section>
  );
}

function ProposalList(props: { label: string; items: string[]; tone?: "warning" }): React.ReactElement {
  return (
    <div className={`proposal-list ${props.tone === "warning" ? "proposal-list-warning" : ""}`}>
      <span>{props.label}</span>
      <div>
        {props.items.map((item) => (
          <code key={item}>{item}</code>
        ))}
      </div>
    </div>
  );
}

function getDropTargetLabel(dropState: "idle" | "hover" | "picked"): string {
  if (dropState === "hover") {
    return "Drop folder";
  }

  if (dropState === "picked") {
    return "Folder picked";
  }

  return "Drop JS/TS folder";
}

function BrowserLinkPanel(props: {
  health: DaemonHealth | null;
  pairingBusy: boolean;
  pairingError: string | null;
  pairingToken: string | null;
  pairingCopied: boolean;
  superiorBrowserState: SuperiorBrowserState | null;
  superiorBrowserBusy: boolean;
  superiorBrowserError: string | null;
  onStartPairing: () => void;
  onResetPairing: () => void;
  onCopyToken: () => void;
  onStopPlaypen: () => void;
}): React.ReactElement {
  const browserStatus = props.health?.browserLinkState.status ?? "offline";
  const superiorStatus = props.superiorBrowserState?.status ?? "closed";
  const activeSession = props.superiorBrowserState?.activeSession;
  const [extensionFolderStatus, setExtensionFolderStatus] = useState<"idle" | "opened" | "missing" | "failed" | "desktop-only">("idle");
  const [extensionFolderPath, setExtensionFolderPath] = useState("");
  const [profileFolderStatus, setProfileFolderStatus] = useState<"idle" | "opened" | "missing" | "failed" | "desktop-only">("idle");

  async function handleOpenExtensionFolder(): Promise<void> {
    const result = await openExtensionFolder();

    if (!result) {
      setExtensionFolderStatus("desktop-only");
      setExtensionFolderPath("");
      return;
    }

    setExtensionFolderPath(result.path);
    setExtensionFolderStatus(result.status === "opened" || result.status === "missing" ? result.status : "failed");
  }

  async function handleOpenProfile(): Promise<void> {
    if (!activeSession) {
      setProfileFolderStatus("missing");
      return;
    }

    const result = await openLocalFolder(activeSession.profilePath);

    if (!result) {
      setProfileFolderStatus("desktop-only");
      return;
    }

    setProfileFolderStatus(result.status === "opened" || result.status === "missing" ? result.status : "failed");
  }

  return (
    <section className="browser-link-panel" aria-label="Browser pairing">
      <div>
        <span>Browser</span>
        <strong>{browserStatus}</strong>
      </div>
      <div className="superior-browser-panel">
        <div className="extension-folder-head">
          <span>SUPERIOR Browser</span>
          <strong>{superiorStatus}</strong>
        </div>
        {activeSession ? (
          <div className="browser-session-strip">
            <code title={activeSession.profilePath}>{activeSession.repoTitle}</code>
            <span>{activeSession.browserKind ?? "browser"}</span>
          </div>
        ) : null}
        <div className="browser-link-actions">
          <button
            className="choice-chip service-action"
            type="button"
            onClick={() => void handleOpenProfile()}
            disabled={!activeSession}
          >
            Open Profile
          </button>
          <button
            className="choice-chip service-action"
            type="button"
            onClick={props.onStopPlaypen}
            disabled={props.superiorBrowserBusy || !activeSession}
          >
            {props.superiorBrowserBusy ? "Stopping..." : "Stop"}
          </button>
        </div>
        <p>{props.superiorBrowserError ?? getProfileFolderStatusText(profileFolderStatus, activeSession?.profilePath)}</p>
      </div>
      {props.pairingToken ? (
        <div className="pairing-token-row">
          <code>{props.pairingToken}</code>
          <button className="choice-chip service-action" type="button" onClick={props.onCopyToken}>
            {props.pairingCopied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
      {props.pairingError ? <p>{props.pairingError}</p> : null}
      <div className="browser-link-actions">
        <button className="choice-chip service-action" type="button" onClick={props.onStartPairing} disabled={props.pairingBusy}>
          {props.pairingBusy ? "Starting..." : "Start Pairing"}
        </button>
        <button className="choice-chip service-action" type="button" onClick={props.onResetPairing} disabled={props.pairingBusy}>
          Reset
        </button>
      </div>
      <div className="extension-folder-panel">
        <div className="extension-folder-head">
          <span>Extension</span>
          <strong>MV3 build</strong>
        </div>
        <button
          className="choice-chip service-action"
          type="button"
          onClick={handleOpenExtensionFolder}
          title={extensionFolderPath || "Open the bundled browser extension folder"}
        >
          Open Folder
        </button>
        <p>{getExtensionFolderStatusText(extensionFolderStatus)}</p>
      </div>
    </section>
  );
}

function getExtensionFolderStatusText(status: "idle" | "opened" | "missing" | "failed" | "desktop-only"): string {
  if (status === "opened") {
    return "Folder opened.";
  }

  if (status === "missing") {
    return "Build extension first.";
  }

  if (status === "failed") {
    return "Could not open folder.";
  }

  if (status === "desktop-only") {
    return "Desktop app opens it.";
  }

  return "Load unpacked in Chrome.";
}

function getProfileFolderStatusText(
  status: "idle" | "opened" | "missing" | "failed" | "desktop-only",
  profilePath?: string
): string {
  if (status === "opened") {
    return "Profile opened.";
  }

  if (status === "missing") {
    return "No profile running.";
  }

  if (status === "failed") {
    return "Could not open profile.";
  }

  if (status === "desktop-only") {
    return "Desktop app opens it.";
  }

  return profilePath ? "Extension paired inside the playpen." : "Start from Repo Reader.";
}

function SetupCell(props: { label: string; value: string }): React.ReactElement {
  return (
    <div className="setup-cell">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function CustomizationPanel(props: {
  bot: BotIdentity;
  onBodyChange: (body: BotBody) => void;
  onColorChange: (color: BotColorId) => void;
  onEyeChange: (eye: BotEye) => void;
  onToggleSkill: (skillId: SkillId) => void;
}): React.ReactElement {
  const skillChoices = runnableSkillShelf;

  return (
    <div className="customizer" aria-label="Bot customization">
      <LoadoutPanel bot={props.bot} />

      <ChoiceGroup label="Parts">
        {skillChoices.map((skill) => (
          <button
            key={skill.id}
            className="choice-chip skill-choice"
            type="button"
            aria-pressed={props.bot.skills.includes(skill.id)}
            onClick={() => props.onToggleSkill(skill.id)}
            title={`${skill.attachment}: ${skill.effect}`}
          >
            <span className={`skill-dot skill-dot-${skill.source}`} />
            <span>{skill.shortLabel}</span>
          </button>
        ))}
      </ChoiceGroup>

      <ChoiceGroup label="Body">
        {botBodies.map((body) => (
          <button
            key={body}
            className="choice-chip body-choice"
            type="button"
            aria-pressed={props.bot.body === body}
            onClick={() => props.onBodyChange(body)}
            title={botBodyCatalog[body].silhouette}
          >
            <span className={`choice-creature choice-creature-${body}`} />
            <span>{botBodyCatalog[body].label}</span>
          </button>
        ))}
      </ChoiceGroup>

      <ChoiceGroup label="Color">
        {(Object.keys(clayPigments) as BotColorId[]).map((color) => (
          <button
            key={color}
            className="choice-chip pigment-choice"
            type="button"
            aria-pressed={props.bot.color === color}
            onClick={() => props.onColorChange(color)}
            title={clayPigments[color].label}
          >
            <span className="pigment-swatch" style={{ backgroundColor: clayPigments[color].hex }} />
            <span>{clayPigments[color].label}</span>
          </button>
        ))}
      </ChoiceGroup>

      <ChoiceGroup label="Eye">
        {botEyes.map((eye) => (
          <button
            key={eye}
            className="choice-chip eye-choice"
            type="button"
            aria-pressed={props.bot.eye === eye}
            onClick={() => props.onEyeChange(eye)}
            title={botEyeCatalog[eye].expression}
          >
            <span className={`eye-sample eye-sample-${eye}`} />
            <span>{botEyeCatalog[eye].label}</span>
          </button>
        ))}
      </ChoiceGroup>
    </div>
  );
}

function LoadoutPanel(props: { bot: BotIdentity; label?: string }): React.ReactElement {
  const equippedBySlot = skillSlots.map((slot) => ({
    slot,
    skill: props.bot.skills.map((skillId) => skillCatalog[skillId]).find((skill) => skill.slot === slot)
  }));

  return (
    <fieldset className="choice-group loadout-group">
      <legend>{props.label ?? "Loadout"}</legend>
      <div className="loadout-slots">
        {equippedBySlot.map(({ slot, skill }) => (
          <div className="loadout-slot" key={slot} data-filled={Boolean(skill)}>
            <span>{skillSlotLabels[slot]}</span>
            <strong>{skill?.shortLabel ?? "Empty"}</strong>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function ChoiceGroup(props: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <fieldset className="choice-group">
      <legend>{props.label}</legend>
      <div>{props.children}</div>
    </fieldset>
  );
}

function SkillRow(props: { skill: SkillDefinition; equipped: boolean }): React.ReactElement {
  return (
    <div className={`skill-row skill-row-${props.skill.source}`} data-equipped={props.equipped}>
      <span className={`skill-attachment attachment-${props.skill.id}`} />
      <span>
        <strong>{props.skill.label}</strong>
        <em>
          {skillSlotLabels[props.skill.slot]} / {props.skill.effect}
        </em>
      </span>
    </div>
  );
}

function getPanelCopy(item: MenuItem): string {
  switch (item) {
    case "New Bot":
      return "Start with body, pigment, eye, and one part.";
    case "Customize Bot":
      return "Swap parts on the bench.";
    case "Skills":
      return "Equip only parts that run.";
    case "Browser Link":
      return "Pair this machine.";
    case "Options":
      return "Local runtime state.";
    case "Quit":
      return "Window controls.";
    case "Continue":
    default:
      return "Workbench state.";
  }
}
