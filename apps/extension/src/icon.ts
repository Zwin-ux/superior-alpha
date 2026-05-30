import { BotIdentity, SkillSlot, clayPigments, getEquippedSkillSlots } from "@clawdbot/shared";

export function renderBotIconSet(bot: BotIdentity): Record<number, ImageData> {
  return {
    16: renderBotIconData(bot, 16),
    32: renderBotIconData(bot, 32),
    48: renderBotIconData(bot, 48),
    128: renderBotIconData(bot, 128)
  };
}

export function renderBotIconData(bot: BotIdentity, size: number): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create icon canvas.");
  }

  const pigment = clayPigments[bot.color];
  const center = size / 2;
  const headRadius = size * (bot.body === "orb" ? 0.39 : bot.body === "sentinel" ? 0.36 : 0.34);
  const equippedSlots = getEquippedSkillSlots(bot);

  context.clearRect(0, 0, size, size);
  context.fillStyle = pigment.shadow;
  context.beginPath();
  context.ellipse(center, center + size * 0.12, headRadius * 1.05, headRadius * 0.78, 0, 0, Math.PI * 2);
  context.fill();

  if (bot.body === "gremlin") {
    drawGremlinAntennae(context, pigment.shadow, center, headRadius, size);
  }

  context.fillStyle = pigment.hex;
  context.beginPath();
  if (bot.body === "sentinel") {
    drawSentinelHead(context, center, headRadius, size);
  } else {
    context.ellipse(
      center,
      center,
      headRadius * (bot.body === "gremlin" ? 1.08 : 1),
      headRadius * (bot.body === "orb" ? 1 : 0.88),
      bot.body === "gremlin" ? -0.12 : -0.04,
      0,
      Math.PI * 2
    );
  }
  context.fill();

  if (bot.body === "orb") {
    context.fillStyle = "rgba(223,248,255,0.34)";
    context.beginPath();
    context.arc(center, center, headRadius * 0.55, 0, Math.PI * 2);
    context.fill();
  }

  drawSkillAttachments(context, equippedSlots, pigment, center, headRadius, size);

  if (bot.body === "scanner" || bot.eye === "lens") {
    drawLensEye(context, center, headRadius, size);
  } else {
    drawEyes(context, bot.eye, center, headRadius, size);
  }

  if (bot.body === "sentinel") {
    context.fillStyle = "rgba(255,244,220,0.28)";
    context.beginPath();
    context.roundRect(center + headRadius * 0.22, center - headRadius * 0.3, headRadius * 0.34, headRadius * 0.46, size * 0.08);
    context.fill();
  }

  if (bot.body === "gremlin") {
    context.fillStyle = pigment.shadow;
    context.beginPath();
    context.arc(center + headRadius * 0.88, center, headRadius * 0.25, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "rgba(255,255,255,0.28)";
  context.beginPath();
  context.ellipse(center - headRadius * 0.28, center - headRadius * 0.35, headRadius * 0.22, headRadius * 0.11, -0.45, 0, Math.PI * 2);
  context.fill();

  return context.getImageData(0, 0, size, size);
}

function drawSkillAttachments(
  context: OffscreenCanvasRenderingContext2D,
  equippedSlots: SkillSlot[],
  pigment: (typeof clayPigments)[keyof typeof clayPigments],
  center: number,
  headRadius: number,
  size: number
): void {
  const hasSlot = (slot: SkillSlot) => equippedSlots.includes(slot);

  if (hasSlot("crown")) {
    context.fillStyle = "#d8a849";
    context.beginPath();
    context.roundRect(center - headRadius * 0.38, center - headRadius * 1.13, headRadius * 0.76, headRadius * 0.32, size * 0.05);
    context.fill();
  }

  if (hasSlot("eye")) {
    const ringX = center - headRadius * 0.82;
    const ringY = center - headRadius * 0.04;

    context.fillStyle = "#e8d6b8";
    context.beginPath();
    context.arc(ringX, ringY, Math.max(2, headRadius * 0.26), 0, Math.PI * 2);
    context.fill();
    context.fillStyle = pigment.hex;
    context.beginPath();
    context.arc(ringX, ringY, Math.max(1, headRadius * 0.14), 0, Math.PI * 2);
    context.fill();
  }

  if (hasSlot("badge")) {
    context.fillStyle = "#fff4dc";
    context.beginPath();
    context.roundRect(
      center + headRadius * 0.58,
      center - headRadius * 0.33,
      headRadius * 0.34,
      headRadius * 0.52,
      size * 0.05
    );
    context.fill();
  }

  if (hasSlot("side")) {
    context.fillStyle = "#d8a849";
    context.beginPath();
    context.arc(center + headRadius * 0.77, center + headRadius * 0.42, Math.max(2, headRadius * 0.18), 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(64,45,31,0.35)";
    context.beginPath();
    context.arc(center + headRadius * 0.77, center + headRadius * 0.42, Math.max(1, headRadius * 0.07), 0, Math.PI * 2);
    context.fill();
  }

  if (hasSlot("charm")) {
    context.fillStyle = "#d8a849";
    context.beginPath();
    context.arc(center, center + headRadius * 0.76, Math.max(2, headRadius * 0.17), 0, Math.PI * 2);
    context.fill();
  }
}

function drawGremlinAntennae(
  context: OffscreenCanvasRenderingContext2D,
  color: string,
  center: number,
  headRadius: number,
  size: number
): void {
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, size * 0.08);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(center - headRadius * 0.35, center - headRadius * 0.7);
  context.lineTo(center - headRadius * 0.68, center - headRadius * 1.16);
  context.moveTo(center + headRadius * 0.24, center - headRadius * 0.72);
  context.lineTo(center + headRadius * 0.58, center - headRadius * 1.05);
  context.stroke();
}

function drawSentinelHead(
  context: OffscreenCanvasRenderingContext2D,
  center: number,
  headRadius: number,
  size: number
): void {
  context.moveTo(center, center - headRadius * 0.92);
  context.lineTo(center + headRadius * 0.9, center - headRadius * 0.42);
  context.lineTo(center + headRadius * 0.76, center + headRadius * 0.64);
  context.lineTo(center, center + headRadius * 0.92);
  context.lineTo(center - headRadius * 0.76, center + headRadius * 0.64);
  context.lineTo(center - headRadius * 0.9, center - headRadius * 0.42);
  context.closePath();
}

function drawLensEye(
  context: OffscreenCanvasRenderingContext2D,
  center: number,
  headRadius: number,
  size: number
): void {
  context.fillStyle = "#7cc8d8";
  context.beginPath();
  context.arc(center, center - headRadius * 0.08, headRadius * 0.34, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(248,255,255,0.86)";
  context.beginPath();
  context.arc(center - headRadius * 0.1, center - headRadius * 0.2, Math.max(1, size * 0.045), 0, Math.PI * 2);
  context.fill();
}

function drawEyes(
  context: OffscreenCanvasRenderingContext2D,
  eye: BotIdentity["eye"],
  center: number,
  headRadius: number,
  size: number
): void {
  const eyeSize = Math.max(2, size * (eye === "dot" ? 0.075 : 0.1));
  const y = center - eyeSize / 2;
  const leftX = center - headRadius * 0.42;
  const rightX = center + headRadius * 0.22;

  context.fillStyle = eye === "glow" ? "#dff8ff" : "#15120f";

  if (eye === "dot" || eye === "glow") {
    context.beginPath();
    context.arc(leftX + eyeSize / 2, y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
    context.arc(rightX + eyeSize / 2, y + eyeSize / 2, eyeSize / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.fillRect(leftX, y, eyeSize, eyeSize);
  context.fillRect(rightX, y, eyeSize, eyeSize);
}
