import { skillLabels, type SkillSlot } from "@clawdbot/shared";
import { useEffect, useRef, type ReactElement } from "react";
import type { WorkbenchRendererProps } from "./WorkbenchRenderer";

const slotTargets: Array<{ target: SkillSlot | "body" | "face"; label: string }> = [
  { target: "body", label: "Body" },
  { target: "face", label: "Face" },
  { target: "eye", label: "Eye Slot" },
  { target: "crown", label: "Crown Slot" },
  { target: "side", label: "Side Slot" },
  { target: "badge", label: "Badge Slot" },
  { target: "charm", label: "Charm Slot" }
];

export function SpriteClayWorkbenchStage(props: WorkbenchRendererProps): ReactElement {
  const { bot } = props;
  const stageRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);
  const feedbackTarget = props.activeTarget ?? props.functionReaction?.slot ?? null;
  const feedbackState = getFeedbackDropState(props.dropState, props.functionReaction);
  const reactionSlot = props.functionReaction?.slot ?? "body";
  const pulseKey = `${props.snapKey}:${props.functionReaction?.pulseKey ?? "idle"}`;

  useEffect(() => {
    const stageElement = stageRef.current;
    const botElement = botRef.current;

    if (!stageElement || !botElement || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    function writePointerState(): void {
      frame = 0;

      const currentStage = stageRef.current;
      const currentBot = botRef.current;

      if (!currentStage || !currentBot) {
        return;
      }

      const stageRect = currentStage.getBoundingClientRect();
      const botRect = currentBot.getBoundingClientRect();
      const botCenterX = botRect.left + botRect.width / 2;
      const botCenterY = botRect.top + botRect.height * 0.42;
      const distanceX = clamp((pointerX - botCenterX) / (botRect.width * 0.56), -1, 1);
      const distanceY = clamp((pointerY - botCenterY) / (botRect.height * 0.5), -1, 1);
      const stageX = clamp((pointerX - stageRect.left) / stageRect.width - 0.5, -0.5, 0.5);
      const stageY = clamp((pointerY - stageRect.top) / stageRect.height - 0.5, -0.5, 0.5);

      currentBot.style.setProperty("--eye-look-x", `${Math.round(distanceX * 9)}px`);
      currentBot.style.setProperty("--eye-look-y", `${Math.round(distanceY * 6)}px`);
      currentStage.style.setProperty("--bench-look-x", `${stageX.toFixed(3)}`);
      currentStage.style.setProperty("--bench-look-y", `${stageY.toFixed(3)}`);
    }

    function queuePointerState(event: PointerEvent): void {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!frame) {
        frame = window.requestAnimationFrame(writePointerState);
      }
    }

    function resetPointerState(): void {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }

      stageRef.current?.style.setProperty("--bench-look-x", "0");
      stageRef.current?.style.setProperty("--bench-look-y", "0");
      botRef.current?.style.setProperty("--eye-look-x", "0px");
      botRef.current?.style.setProperty("--eye-look-y", "0px");
    }

    window.addEventListener("pointermove", queuePointerState);
    window.addEventListener("pointerleave", resetPointerState);
    window.addEventListener("blur", resetPointerState);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("pointermove", queuePointerState);
      window.removeEventListener("pointerleave", resetPointerState);
      window.removeEventListener("blur", resetPointerState);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="bot-stage sprite-workbench-stage"
      data-camera={props.cameraMode}
      data-drop-state={feedbackState}
      data-active-target={feedbackTarget ?? "none"}
      data-reaction={props.functionReaction?.state ?? "idle"}
      data-reaction-slot={reactionSlot}
      aria-label={`${bot.name} SUPERIOR clay assembly bench`}
      onDragOver={props.onAssemblyDragOver}
      onDragLeave={props.onAssemblyDragLeave}
      onDrop={props.onAssemblyDrop}
    >
      <div className="sprite-bench-wall" aria-hidden="true" />
      <div className="sprite-bench-light" aria-hidden="true" />
      <div className="sprite-bench-shelf" aria-hidden="true" />
      <div className="sprite-table-plane" aria-hidden="true">
        <span className="sprite-table-back" />
        <span className="sprite-table-top" />
        <span className="sprite-table-front" />
      </div>
      <div className="sprite-bot-shadow" aria-hidden="true" />
      <div ref={botRef} className={`sprite-bot-rig clay-bot clay-bot-${bot.body} clay-eye-${bot.eye}`}>
        <span className="bot-antenna antenna-a" />
        <span className="bot-antenna antenna-b" />
        <span className="bot-lens" />
        <span className="bot-orb-glow" />
        <span className="bot-shield-stamp" />
        <span className="bot-gear" />
        <span className="bot-eye eye-a" />
        <span className="bot-eye eye-b" />
        <span className="bot-mouth" />
        <span className="clay-smudge smudge-a" />
        <span className="clay-smudge smudge-b" />
        {bot.skills.map((skill) => (
          <span
            key={skill}
            className={`bot-skill-piece bot-skill-${skill}`}
            aria-label={skillLabels[skill]}
            title={skillLabels[skill]}
          />
        ))}
        <span key={pulseKey} className="sprite-snap-flash" data-target={feedbackTarget ?? reactionSlot} aria-hidden="true" />
      </div>
      <div className="sprite-slot-layer" aria-hidden="true">
        {slotTargets.map((slot) => (
          <span
            key={slot.target}
            className="sprite-slot-anchor"
            data-target={slot.target}
            data-active={feedbackTarget === slot.target || (slot.target === "face" && feedbackTarget === "eye")}
          >
            {slot.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function getFeedbackDropState(
  dropState: WorkbenchRendererProps["dropState"],
  reaction: WorkbenchRendererProps["functionReaction"]
): WorkbenchRendererProps["dropState"] {
  if (dropState !== "idle" || !reaction) {
    return dropState;
  }

  return reaction.state === "failure" ? "invalid" : "snapped";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
