import {
  BotBody,
  BotColorId,
  BotEye,
  BotIdentity,
  SkillId,
  SkillSlot,
  botBodies,
  botBodyCatalog,
  botEyeCatalog,
  botEyes,
  clayPigments,
  runnableSkillShelf,
  skillCatalog
} from "@clawdbot/shared";

export type WorkshopCameraMode = "idle" | "assembly" | "body" | "eye" | "slot";
export type AssemblyPartKind = "body" | "color" | "eye" | "skill";
export type AssemblyDropState = "idle" | "dragging" | "valid" | "invalid" | "snapped";
export type AssemblySlotTarget = "body" | "color" | "face" | SkillSlot;

export type AssemblyPart =
  | {
      id: string;
      kind: "body";
      label: string;
      detail: string;
      target: "body";
      body: BotBody;
      equipped: boolean;
    }
  | {
      id: string;
      kind: "color";
      label: string;
      detail: string;
      target: "color";
      color: BotColorId;
      swatch: string;
      equipped: boolean;
    }
  | {
      id: string;
      kind: "eye";
      label: string;
      detail: string;
      target: "face";
      eye: BotEye;
      equipped: boolean;
    }
  | {
      id: string;
      kind: "skill";
      label: string;
      detail: string;
      target: SkillSlot;
      skillId: SkillId;
      equipped: boolean;
    };

export function getAssemblyParts(bot: BotIdentity): AssemblyPart[] {
  return [
    ...botBodies.map<AssemblyPart>((body) => ({
      id: `body:${body}`,
      kind: "body",
      label: botBodyCatalog[body].label,
      detail: botBodyCatalog[body].accessory,
      target: "body",
      body,
      equipped: bot.body === body
    })),
    ...(Object.keys(clayPigments) as BotColorId[]).map<AssemblyPart>((color) => ({
      id: `color:${color}`,
      kind: "color",
      label: clayPigments[color].label,
      detail: "clay pigment",
      target: "color",
      color,
      swatch: clayPigments[color].hex,
      equipped: bot.color === color
    })),
    ...botEyes.map<AssemblyPart>((eye) => ({
      id: `eye:${eye}`,
      kind: "eye",
      label: botEyeCatalog[eye].label,
      detail: botEyeCatalog[eye].expression,
      target: "face",
      eye,
      equipped: bot.eye === eye
    })),
    ...runnableSkillShelf.map<AssemblyPart>((skill) => ({
      id: `skill:${skill.id}`,
      kind: "skill",
      label: skill.shortLabel,
      detail: skill.attachment,
      target: skill.slot,
      skillId: skill.id,
      equipped: bot.skills.includes(skill.id)
    }))
  ];
}

export function findAssemblyPart(parts: AssemblyPart[], partId: string | null): AssemblyPart | null {
  if (!partId) {
    return null;
  }

  return parts.find((part) => part.id === partId) ?? null;
}

export function getAssemblyCameraMode(part: AssemblyPart | null, dropState: AssemblyDropState): WorkshopCameraMode {
  if (dropState === "valid" || dropState === "snapped") {
    return part?.kind === "eye" ? "eye" : part?.kind === "body" || part?.kind === "color" ? "body" : "slot";
  }

  if (!part) {
    return "assembly";
  }

  if (part.kind === "eye") {
    return "eye";
  }

  if (part.kind === "skill") {
    return "slot";
  }

  return "body";
}

export function getSkillLoadoutAfterEquip(bot: BotIdentity, skillId: SkillId): SkillId[] {
  const targetSkill = skillCatalog[skillId];

  return [...bot.skills.filter((existingSkill) => skillCatalog[existingSkill].slot !== targetSkill.slot), skillId];
}
