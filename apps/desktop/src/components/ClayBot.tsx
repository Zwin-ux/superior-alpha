import { BotIdentity, skillLabels } from "@clawdbot/shared";
import { useEffect, useRef } from "react";

export function ClayBot(props: { bot: BotIdentity }): React.ReactElement {
  const { bot } = props;
  const botRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const botElement = botRef.current;

    if (!botElement || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    function writeEyeLook(): void {
      frame = 0;

      const currentBot = botRef.current;

      if (!currentBot) {
        return;
      }

      const rect = currentBot.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.42;
      const distanceX = clamp((pointerX - centerX) / (rect.width * 0.55), -1, 1);
      const distanceY = clamp((pointerY - centerY) / (rect.height * 0.48), -1, 1);

      currentBot.style.setProperty("--eye-look-x", `${Math.round(distanceX * 8)}px`);
      currentBot.style.setProperty("--eye-look-y", `${Math.round(distanceY * 6)}px`);
    }

    function queueEyeLook(event: PointerEvent): void {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!frame) {
        frame = window.requestAnimationFrame(writeEyeLook);
      }
    }

    function resetEyeLook(): void {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }

      const currentBot = botRef.current;

      currentBot?.style.setProperty("--eye-look-x", "0px");
      currentBot?.style.setProperty("--eye-look-y", "0px");
    }

    window.addEventListener("pointermove", queueEyeLook);
    window.addEventListener("pointerleave", resetEyeLook);
    window.addEventListener("blur", resetEyeLook);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("pointermove", queueEyeLook);
      window.removeEventListener("pointerleave", resetEyeLook);
      window.removeEventListener("blur", resetEyeLook);
    };
  }, []);

  return (
    <div className="bot-stage" aria-label={`${bot.name} SUPERIOR bot preview`}>
      <div className="bot-shadow" aria-hidden="true" />
      <div ref={botRef} className={`clay-bot clay-bot-${bot.body} clay-eye-${bot.eye}`}>
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
      </div>
      <div className="clay-table" aria-hidden="true" />
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
