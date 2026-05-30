import {
  SkillId,
  SuperiorFunctionCatalogResponse,
  SuperiorFunctionDefinition,
  SuperiorFunctionId,
  skillCatalog
} from "@clawdbot/shared";

type SkillFunctionId = Extract<SkillId, SuperiorFunctionId>;

function skillFunction(
  skillId: SkillFunctionId,
  override: Pick<SuperiorFunctionDefinition, "runnerKind" | "surfaces" | "permissions">
): SuperiorFunctionDefinition {
  const skill = skillCatalog[skillId];

  return {
    type: "superior-function-definition",
    id: skillId,
    label: skill.label,
    shortLabel: skill.shortLabel,
    status: "runnable",
    runnerKind: override.runnerKind,
    surfaces: override.surfaces,
    permissions: override.permissions,
    skillId,
    slot: skill.slot,
    category: skill.category,
    attachment: skill.attachment,
    effect: skill.effect
  };
}

export const superiorFunctionCatalog: Record<SuperiorFunctionId, SuperiorFunctionDefinition> = {
  "page-explainer": skillFunction("page-explainer", {
    runnerKind: "model",
    surfaces: ["extension", "browser-runtime"],
    permissions: ["browser-pairing", "model-provider"]
  }),
  "article-xray": skillFunction("article-xray", {
    runnerKind: "local",
    surfaces: ["extension", "browser-runtime"],
    permissions: ["browser-pairing"]
  }),
  "repo-reader": skillFunction("repo-reader", {
    runnerKind: "repo",
    surfaces: ["workshop"],
    permissions: ["repo-network"]
  }),
  "superior-browser-start": {
    type: "superior-function-definition",
    id: "superior-browser-start",
    label: "Start Playpen",
    shortLabel: "Start",
    status: "runnable",
    runnerKind: "browser",
    surfaces: ["workshop"],
    permissions: ["browser-runtime"],
    attachment: "Clay launch key",
    effect: "Starts the robot browser."
  },
  "superior-browser-stop": {
    type: "superior-function-definition",
    id: "superior-browser-stop",
    label: "Stop Playpen",
    shortLabel: "Stop",
    status: "runnable",
    runnerKind: "browser",
    surfaces: ["workshop"],
    permissions: ["browser-runtime"],
    attachment: "Clay stop peg",
    effect: "Stops the robot browser."
  },
  "custom-skill-import-proposal": {
    type: "superior-function-definition",
    id: "custom-skill-import-proposal",
    label: "Custom Part Scan",
    shortLabel: "Scan",
    status: "proposal",
    runnerKind: "proposal",
    surfaces: ["workshop"],
    permissions: ["local-files"],
    attachment: "Blank clay socket",
    effect: "Scans a JS/TS folder."
  }
};

export function readSuperiorFunctionCatalog(): SuperiorFunctionCatalogResponse {
  return {
    type: "superior-function-catalog",
    items: Object.values(superiorFunctionCatalog),
    createdAt: new Date().toISOString()
  };
}

export function getSuperiorFunctionDefinition(functionId: SuperiorFunctionId): SuperiorFunctionDefinition | undefined {
  return superiorFunctionCatalog[functionId];
}
