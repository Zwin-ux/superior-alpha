export const superiorSignalKinds = ["repo", "browser", "market", "system", "agent"] as const;
export type SuperiorSignalKind = (typeof superiorSignalKinds)[number];

export type SuperiorEngineMode = "boot" | "idle" | "syncing" | "alert";
export type SuperiorPatchOp = "set" | "merge" | "event";

export interface SuperiorAgentAvatar {
  id: string;
  name: string;
  body: "orb" | "gremlin" | "scanner" | "sentinel" | "core";
  palette: "lavender" | "moss" | "sky" | "brick" | "gold" | "chalk" | "charcoal";
  eye: "glow" | "pixel" | "lens" | "dot";
  equippedSlots: Partial<Record<"eye" | "crown" | "side" | "badge" | "charm", string>>;
}

export interface SuperiorSignalEvent {
  id: string;
  kind: SuperiorSignalKind;
  label: string;
  source: "server" | "extension" | "godot" | "daemon" | "fixture";
  intensity: 0 | 1 | 2 | 3;
  detail?: string;
  createdAt: string;
}

export interface SuperiorSignalRoomState {
  bootLine: string;
  serverStatus: "offline" | "connecting" | "online" | "stale";
  terminalLines: string[];
  lastSignalAt?: string;
}

export interface SuperiorEngineState {
  schemaVersion: "0.1";
  revision: number;
  mode: SuperiorEngineMode;
  avatar: SuperiorAgentAvatar;
  room: SuperiorSignalRoomState;
  events: SuperiorSignalEvent[];
  updatedAt: string;
}

export interface SuperiorStatePatch {
  id: string;
  op: SuperiorPatchOp;
  path: "mode" | "avatar" | "room" | "room.terminalLines" | "events";
  value: unknown;
  createdAt: string;
}

export type SuperiorRealtimeMessage =
  | { type: "hello"; serverTime: string; state: SuperiorEngineState }
  | { type: "state"; state: SuperiorEngineState }
  | { type: "patch"; patch: SuperiorStatePatch; state: SuperiorEngineState }
  | { type: "signal"; event: SuperiorSignalEvent; state: SuperiorEngineState }
  | { type: "error"; code: string; message: string };

export function createInitialSuperiorState(now = new Date().toISOString()): SuperiorEngineState {
  return {
    schemaVersion: "0.1",
    revision: 0,
    mode: "boot",
    avatar: {
      id: "active-clawd",
      name: "Clawd",
      body: "orb",
      palette: "lavender",
      eye: "glow",
      equippedSlots: {
        eye: "article-xray",
        badge: "page-explainer",
        side: "repo-reader"
      }
    },
    room: {
      bootLine: "SUPERIOR SIGNAL ROOM",
      serverStatus: "offline",
      terminalLines: ["BOOT / WAITING FOR SERVER"],
      lastSignalAt: undefined
    },
    events: [],
    updatedAt: now
  };
}

export function createSignalEvent(input: {
  kind: SuperiorSignalKind;
  label: string;
  source?: SuperiorSignalEvent["source"];
  intensity?: SuperiorSignalEvent["intensity"];
  detail?: string;
  createdAt?: string;
}): SuperiorSignalEvent {
  return {
    id: createId("sig"),
    kind: input.kind,
    label: input.label.trim() || "Signal",
    source: input.source ?? "server",
    intensity: input.intensity ?? 1,
    ...(input.detail ? { detail: input.detail } : {}),
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

export function createStatePatch(input: {
  op: SuperiorPatchOp;
  path: SuperiorStatePatch["path"];
  value: unknown;
  createdAt?: string;
}): SuperiorStatePatch {
  return {
    id: createId("patch"),
    op: input.op,
    path: input.path,
    value: input.value,
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

export function applySuperiorPatch(state: SuperiorEngineState, patch: SuperiorStatePatch): SuperiorEngineState {
  const updatedAt = patch.createdAt;
  const next: SuperiorEngineState = {
    ...state,
    avatar: { ...state.avatar, equippedSlots: { ...state.avatar.equippedSlots } },
    room: { ...state.room, terminalLines: [...state.room.terminalLines] },
    events: [...state.events],
    revision: state.revision + 1,
    updatedAt
  };

  if (patch.op === "event") {
    const event = normalizeSignalEvent(patch.value);
    next.events = [event, ...next.events].slice(0, 20);
    next.room.lastSignalAt = event.createdAt;
    next.room.terminalLines = [`${event.kind.toUpperCase()} / ${event.label}`, ...next.room.terminalLines].slice(0, 8);
    next.mode = event.intensity >= 2 ? "alert" : "syncing";
    return next;
  }

  if (patch.path === "mode" && typeof patch.value === "string") {
    next.mode = patch.value as SuperiorEngineMode;
    return next;
  }

  if (patch.path === "avatar" && isObject(patch.value)) {
    next.avatar = {
      ...next.avatar,
      ...patch.value,
      equippedSlots: {
        ...next.avatar.equippedSlots,
        ...(isObject(patch.value.equippedSlots) ? patch.value.equippedSlots : {})
      }
    } as SuperiorAgentAvatar;
    return next;
  }

  if (patch.path === "room" && isObject(patch.value)) {
    next.room = {
      ...next.room,
      ...patch.value,
      terminalLines: Array.isArray(patch.value.terminalLines) ? patch.value.terminalLines.map(String).slice(0, 8) : next.room.terminalLines
    };
    return next;
  }

  if (patch.path === "room.terminalLines" && Array.isArray(patch.value)) {
    next.room.terminalLines = patch.value.map(String).slice(0, 8);
    return next;
  }

  return next;
}

export function messageToJson(message: SuperiorRealtimeMessage): string {
  return JSON.stringify(message);
}

function normalizeSignalEvent(value: unknown): SuperiorSignalEvent {
  if (isSignalEvent(value)) {
    return value;
  }

  return createSignalEvent({
    kind: "system",
    label: "Malformed signal",
    source: "server",
    intensity: 2,
    detail: "Server received an event patch without a valid signal payload."
  });
}

function isSignalEvent(value: unknown): value is SuperiorSignalEvent {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    superiorSignalKinds.includes(value.kind as SuperiorSignalKind) &&
    typeof value.label === "string" &&
    typeof value.createdAt === "string"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createId(prefix: string): string {
  const suffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `${prefix}_${suffix}`;
}
