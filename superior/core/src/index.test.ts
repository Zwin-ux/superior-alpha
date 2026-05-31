import { describe, expect, it } from "vitest";
import { applySuperiorPatch, createInitialSuperiorState, createSignalEvent, createStatePatch } from "./index.js";

describe("SUPERIOR alpha engine state", () => {
  it("starts as a booting signal room with Clawd attached", () => {
    const state = createInitialSuperiorState("2026-05-30T00:00:00.000Z");

    expect(state.mode).toBe("boot");
    expect(state.avatar.name).toBe("Clawd");
    expect(state.avatar.equippedSlots.eye).toBe("article-xray");
    expect(state.room.bootLine).toBe("SUPERIOR SIGNAL ROOM");
  });

  it("turns signal events into terminal lines and revision changes", () => {
    const state = createInitialSuperiorState("2026-05-30T00:00:00.000Z");
    const event = createSignalEvent({
      kind: "browser",
      label: "Chrome hand paired",
      source: "extension",
      intensity: 2,
      createdAt: "2026-05-30T00:00:01.000Z"
    });
    const patch = createStatePatch({
      op: "event",
      path: "events",
      value: event,
      createdAt: event.createdAt
    });

    const next = applySuperiorPatch(state, patch);

    expect(next.revision).toBe(1);
    expect(next.mode).toBe("alert");
    expect(next.events[0]?.label).toBe("Chrome hand paired");
    expect(next.room.terminalLines[0]).toBe("BROWSER / Chrome hand paired");
  });
});
