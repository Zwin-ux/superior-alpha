export const botBodies = ["core", "scanner", "sentinel", "gremlin", "orb"] as const;
export type BotBody = (typeof botBodies)[number];

export interface BotBodyDefinition {
  id: BotBody;
  label: string;
  silhouette: string;
  accessory: string;
}

export const botEyes = ["dot", "pixel", "lens", "glow"] as const;
export type BotEye = (typeof botEyes)[number];

export interface BotEyeDefinition {
  id: BotEye;
  label: string;
  expression: string;
}

export const skillIds = [
  "page-explainer",
  "article-xray",
  "transcript-lens",
  "ai-pattern-detector",
  "change-sentinel",
  "prediction-pulse",
  "market-lane-scout",
  "crew-signal",
  "feed-xray",
  "repo-reader",
  "dark-pattern-scanner",
  "job-scanner",
  "price-watch",
  "citation-checker",
  "deal-scout"
] as const;
export type SkillId = (typeof skillIds)[number];

export type SkillSource = "core" | "synergy" | "sup" | "popular";
export type SkillStatus = "equipped" | "source-mapped" | "concept";
export type SkillCategory = "explain" | "extract" | "detect" | "monitor" | "predict" | "work";
export const skillSlots = ["eye", "crown", "side", "badge", "charm"] as const;
export type SkillSlot = (typeof skillSlots)[number];

export const skillSlotLabels: Record<SkillSlot, string> = {
  eye: "Eye",
  crown: "Crown",
  side: "Side",
  badge: "Badge",
  charm: "Charm"
};

export interface SkillDefinition {
  id: SkillId;
  label: string;
  shortLabel: string;
  source: SkillSource;
  status: SkillStatus;
  category: SkillCategory;
  slot: SkillSlot;
  attachment: string;
  effect: string;
  description: string;
  gameLoop: string;
}

export const clayPigments = {
  skyBlue: {
    label: "Sky Blue",
    hex: "#7db7d4",
    shadow: "#4e8098",
    highlight: "#b9dceb"
  },
  mossGreen: {
    label: "Moss Green",
    hex: "#7f9b64",
    shadow: "#566d46",
    highlight: "#b8c9a6"
  },
  brickRed: {
    label: "Brick Red",
    hex: "#b75d47",
    shadow: "#823f31",
    highlight: "#d98d78"
  },
  sunGold: {
    label: "Sun Gold",
    hex: "#d8a849",
    shadow: "#9a7331",
    highlight: "#f0cd7a"
  },
  lavender: {
    label: "Lavender",
    hex: "#aa8ac2",
    shadow: "#715b82",
    highlight: "#d2b8e1"
  },
  chalkWhite: {
    label: "Chalk White",
    hex: "#e7dfd2",
    shadow: "#b9ad9b",
    highlight: "#fff8ec"
  },
  charcoal: {
    label: "Charcoal",
    hex: "#403d3a",
    shadow: "#242220",
    highlight: "#6c6660"
  }
} as const;

export type BotColorId = keyof typeof clayPigments;

export const botBodyCatalog: Record<BotBody, BotBodyDefinition> = {
  core: {
    id: "core",
    label: "Core",
    silhouette: "Round handmade desktop head",
    accessory: "small top nubs"
  },
  scanner: {
    id: "scanner",
    label: "Scanner",
    silhouette: "Round head with a pressed clay lens",
    accessory: "large lens"
  },
  sentinel: {
    id: "sentinel",
    label: "Sentinel",
    silhouette: "Soft helmet wedge",
    accessory: "shield stamp"
  },
  gremlin: {
    id: "gremlin",
    label: "Gremlin",
    silhouette: "Scrappy uneven goblin-engineer head",
    accessory: "bent antennae and side gear"
  },
  orb: {
    id: "orb",
    label: "Orb",
    silhouette: "Smooth clay sphere",
    accessory: "breathing inner glow"
  }
};

export const botEyeCatalog: Record<BotEye, BotEyeDefinition> = {
  dot: {
    id: "dot",
    label: "Dot",
    expression: "simple soft dots"
  },
  pixel: {
    id: "pixel",
    label: "Pixel",
    expression: "chunky square eyes"
  },
  lens: {
    id: "lens",
    label: "Lens",
    expression: "single readable scanner eye"
  },
  glow: {
    id: "glow",
    label: "Glow",
    expression: "warm lit clay eyes"
  }
};

export interface BotRule {
  id: string;
  label: string;
  enabled: boolean;
}

export interface BrowserLinkState {
  status: "unpaired" | "pairing" | "paired" | "offline";
  pairingToken?: string;
  extensionId?: string;
  lastSeenAt?: string;
}

export interface IconVariant {
  surface: "launcher" | "floating-buddy" | "extension-popup" | "context-menu";
  body: BotBody;
  color: BotColorId;
  eye: BotEye;
}

export interface BotIdentity {
  id: string;
  name: string;
  body: BotBody;
  color: BotColorId;
  eye: BotEye;
  skills: SkillId[];
  rules: BotRule[];
  browserLinkState: BrowserLinkState;
  iconVariant: IconVariant;
}

export const skillCatalog: Record<SkillId, SkillDefinition> = {
  "page-explainer": {
    id: "page-explainer",
    label: "Page Explainer",
    shortLabel: "Explain",
    source: "core",
    status: "equipped",
    category: "explain",
    slot: "badge",
    attachment: "Clay paper tab",
    effect: "Explains the page.",
    description: "Turns the current page into a short, useful read.",
    gameLoop: "Read page -> explain -> save or dismiss"
  },
  "article-xray": {
    id: "article-xray",
    label: "Article X-Ray",
    shortLabel: "X-Ray",
    source: "synergy",
    status: "equipped",
    category: "extract",
    slot: "eye",
    attachment: "Pressed clay lens ring",
    effect: "Cleans article text.",
    description: "Ports Synergy's Defuddle-style extraction into a clean article read.",
    gameLoop: "Extract page -> compare coverage -> show clean text"
  },
  "transcript-lens": {
    id: "transcript-lens",
    label: "Transcript Lens",
    shortLabel: "Transcript",
    source: "synergy",
    status: "source-mapped",
    category: "extract",
    slot: "crown",
    attachment: "Tiny caption reel",
    effect: "Finds transcript clues.",
    description: "Ports Synergy's YouTube transcript-first analysis path.",
    gameLoop: "Find transcript -> grade source -> explain video"
  },
  "ai-pattern-detector": {
    id: "ai-pattern-detector",
    label: "AI Pattern Detector",
    shortLabel: "Pattern",
    source: "synergy",
    status: "source-mapped",
    category: "detect",
    slot: "badge",
    attachment: "Stamped checker badge",
    effect: "Marks pattern risk.",
    description: "Uses Synergy's local writing-pattern heuristics as a browser skill.",
    gameLoop: "Collect text -> score patterns -> show confidence"
  },
  "change-sentinel": {
    id: "change-sentinel",
    label: "Change Sentinel",
    shortLabel: "Sentinel",
    source: "synergy",
    status: "source-mapped",
    category: "monitor",
    slot: "charm",
    attachment: "Clay alarm bead",
    effect: "Watches for changes.",
    description: "Ports Synergy's monitor/change-event contracts into page watching.",
    gameLoop: "Pin page -> compare snapshots -> call out change"
  },
  "prediction-pulse": {
    id: "prediction-pulse",
    label: "Prediction Pulse",
    shortLabel: "Pulse",
    source: "sup",
    status: "source-mapped",
    category: "predict",
    slot: "side",
    attachment: "Sun Gold pulse coin",
    effect: "Reads the lane.",
    description: "Ports SUP's IN/HOLD/OUT pulse loop for decision reads.",
    gameLoop: "Scan lane -> choose IN/HOLD/OUT -> resolve pulse"
  },
  "market-lane-scout": {
    id: "market-lane-scout",
    label: "Market Lane Scout",
    shortLabel: "Scout",
    source: "sup",
    status: "source-mapped",
    category: "predict",
    slot: "side",
    attachment: "Clay lane flag",
    effect: "Scouts market lanes.",
    description: "Ports SUP's lane states, risk levels, crowd pressure, and modifiers.",
    gameLoop: "Pick lane -> read state -> choose safer move"
  },
  "crew-signal": {
    id: "crew-signal",
    label: "Crew Signal",
    shortLabel: "Crew",
    source: "sup",
    status: "source-mapped",
    category: "predict",
    slot: "charm",
    attachment: "Tiny crew radio",
    effect: "Reads crew signals.",
    description: "Ports SUP's crew activity and reward-read feedback.",
    gameLoop: "Read crowd -> compare crew moves -> earn signal"
  },
  "feed-xray": {
    id: "feed-xray",
    label: "Feed X-Ray",
    shortLabel: "Feed",
    source: "popular",
    status: "concept",
    category: "detect",
    slot: "eye",
    attachment: "Clay feed scanner",
    effect: "Finds feed patterns.",
    description: "Finds patterns, repeats, and signal in noisy feeds.",
    gameLoop: "Scan feed -> mark signal -> ignore sludge"
  },
  "repo-reader": {
    id: "repo-reader",
    label: "Repo Reader",
    shortLabel: "Repo",
    source: "popular",
    status: "equipped",
    category: "work",
    slot: "side",
    attachment: "Tiny clay gear",
    effect: "Maps repo shape.",
    description: "Reads a public GitHub repo link and turns it into a compact structure and risk pass.",
    gameLoop: "Drop repo -> map files -> pick next move"
  },
  "dark-pattern-scanner": {
    id: "dark-pattern-scanner",
    label: "Dark Pattern Scanner",
    shortLabel: "Dark",
    source: "popular",
    status: "concept",
    category: "detect",
    slot: "badge",
    attachment: "Clay shield badge",
    effect: "Flags manipulative UI.",
    description: "Flags manipulative checkout, signup, and cancellation patterns.",
    gameLoop: "Inspect flow -> stamp risk -> suggest escape"
  },
  "job-scanner": {
    id: "job-scanner",
    label: "Job Scanner",
    shortLabel: "Jobs",
    source: "popular",
    status: "concept",
    category: "work",
    slot: "badge",
    attachment: "Clay job stamp",
    effect: "Reads job posts.",
    description: "Reads job posts for fit, red flags, keywords, and application angles.",
    gameLoop: "Open post -> score fit -> draft next move"
  },
  "price-watch": {
    id: "price-watch",
    label: "Price Watch",
    shortLabel: "Price",
    source: "popular",
    status: "concept",
    category: "monitor",
    slot: "charm",
    attachment: "Clay price tag",
    effect: "Watches price moves.",
    description: "Watches a product or ticket page and calls out meaningful changes.",
    gameLoop: "Pin price -> wait -> notify on move"
  },
  "citation-checker": {
    id: "citation-checker",
    label: "Citation Checker",
    shortLabel: "Cite",
    source: "popular",
    status: "concept",
    category: "detect",
    slot: "crown",
    attachment: "Clay bookmark tab",
    effect: "Checks visible sources.",
    description: "Checks whether claims on a page are backed by visible sources.",
    gameLoop: "Read claims -> find sources -> mark gaps"
  },
  "deal-scout": {
    id: "deal-scout",
    label: "Deal Scout",
    shortLabel: "Deals",
    source: "popular",
    status: "concept",
    category: "work",
    slot: "charm",
    attachment: "Clay coupon clip",
    effect: "Finds the catch.",
    description: "Summarizes offers, catches traps, and compares the actual value.",
    gameLoop: "Scan offer -> find catch -> decide"
  }
};

export const skillLabels = Object.fromEntries(
  skillIds.map((skillId) => [skillId, skillCatalog[skillId].label])
) as Record<SkillId, string>;

export const skillShelf = skillIds.map((skillId) => skillCatalog[skillId]);

export function isRunnableSkill(skill: SkillDefinition): boolean {
  return skill.status === "equipped";
}

export const runnableSkillShelf = skillShelf.filter(isRunnableSkill);
export const runnableSkillIds = runnableSkillShelf.map((skill) => skill.id);
export const defaultSkillLoadout: SkillId[] = ["page-explainer", "article-xray", "repo-reader"];

export function sanitizeSkillIds(skills: SkillId[]): SkillId[] {
  const runnableIds = new Set<SkillId>(runnableSkillIds);
  const seenIds = new Set<SkillId>();
  const filteredSkills = skills.filter((skillId) => {
    if (!runnableIds.has(skillId) || seenIds.has(skillId)) {
      return false;
    }

    seenIds.add(skillId);
    return true;
  });

  return filteredSkills.length > 0 ? filteredSkills : [...defaultSkillLoadout];
}

export const DEFAULT_BOT_IDENTITY: BotIdentity = {
  id: "local-default",
  name: "Superior",
  body: "gremlin",
  color: "mossGreen",
  eye: "pixel",
  skills: [...defaultSkillLoadout],
  rules: [
    {
      id: "concise",
      label: "Keep explanations short",
      enabled: true
    },
    {
      id: "cite-page",
      label: "Refer only to page content",
      enabled: true
    }
  ],
  browserLinkState: {
    status: "unpaired"
  },
  iconVariant: {
    surface: "launcher",
    body: "gremlin",
    color: "mossGreen",
    eye: "pixel"
  }
};

export function makeBotCssVars(bot: BotIdentity): Record<string, string> {
  const pigment = clayPigments[bot.color];

  return {
    "--bot-clay": pigment.hex,
    "--bot-clay-shadow": pigment.shadow,
    "--bot-clay-highlight": pigment.highlight,
    "--bot-eye": bot.eye === "glow" || bot.eye === "lens" ? "#bfefff" : "#14110f"
  };
}

export function updateBotIdentity(
  bot: BotIdentity,
  changes: Partial<Pick<BotIdentity, "body" | "color" | "eye" | "name" | "skills">>
): BotIdentity {
  const nextBody = changes.body ?? bot.body;
  const nextColor = changes.color ?? bot.color;
  const nextEye = changes.eye ?? bot.eye;
  const nextName = normalizeBotName(changes.name ?? bot.name);
  const nextSkills = sanitizeSkillIds(changes.skills ?? bot.skills);

  return {
    ...bot,
    ...changes,
    name: nextName,
    body: nextBody,
    color: nextColor,
    eye: nextEye,
    skills: nextSkills,
    iconVariant: {
      ...bot.iconVariant,
      body: nextBody,
      color: nextColor,
      eye: nextEye
    }
  };
}

function normalizeBotName(name: string): string {
  const trimmedName = name.trim();

  if (!trimmedName || trimmedName === "Claw") {
    return "Superior";
  }

  return trimmedName;
}

export function getEquippedSkillSlots(bot: BotIdentity): SkillSlot[] {
  const seenSlots = new Set<SkillSlot>();

  return bot.skills.reduce<SkillSlot[]>((slots, skillId) => {
    const skill = skillCatalog[skillId];

    if (!skill || seenSlots.has(skill.slot)) {
      return slots;
    }

    seenSlots.add(skill.slot);
    slots.push(skill.slot);

    return slots;
  }, []);
}

export function createBotIconSvg(bot: BotIdentity, size = 64): string {
  const pigment = clayPigments[bot.color];
  const center = 32;
  const radius = bot.body === "orb" ? 23 : 21;
  const eyeColor = bot.eye === "glow" || bot.eye === "lens" ? "#dff8ff" : "#15120f";
  const skillSlots = getEquippedSkillSlots(bot);
  const head =
    bot.body === "sentinel"
      ? `<path d="M${center} 7 L54 19 L50 48 L${center} 58 L14 48 L10 19 Z" fill="${pigment.hex}"/>`
      : `<ellipse cx="${center}" cy="${center}" rx="${bot.body === "gremlin" ? radius + 2 : radius}" ry="${
          bot.body === "orb" ? radius : radius - 3
        }" fill="${pigment.hex}"/>`;
  const antennae =
    bot.body === "gremlin"
      ? `<path d="M24 15 L16 4 M39 15 L48 6" stroke="${pigment.shadow}" stroke-width="6" stroke-linecap="round"/>`
      : "";
  const inner =
    bot.body === "orb"
      ? `<circle cx="${center}" cy="${center}" r="13" fill="#dff8ff" opacity=".32"/>`
      : bot.body === "sentinel"
        ? `<rect x="39" y="22" width="9" height="15" rx="4" fill="#fff4dc" opacity=".28"/>`
        : "";
  const eyes =
    bot.eye === "lens" || bot.body === "scanner"
      ? `<circle cx="${center}" cy="29" r="11" fill="#7cc8d8"/><circle cx="29" cy="25" r="3" fill="#f7ffff"/>`
      : `<circle cx="25" cy="31" r="${bot.eye === "dot" ? 3 : 4}" fill="${eyeColor}"/><circle cx="39" cy="31" r="${
          bot.eye === "dot" ? 3 : 4
        }" fill="${eyeColor}"/>`;
  const gear =
    bot.body === "gremlin"
      ? `<circle cx="54" cy="32" r="7" fill="${pigment.shadow}"/><circle cx="54" cy="32" r="3" fill="#d9c0a0"/>`
      : "";
  const skillPieces = [
    skillSlots.includes("crown")
      ? `<rect x="23" y="7" width="18" height="9" rx="4" fill="#d8a849"/><path d="M26 8 L30 3 L34 8 L39 3 L38 15 L25 15 Z" fill="#f0cd7a" opacity=".72"/>`
      : "",
    skillSlots.includes("eye")
      ? `<circle cx="15" cy="31" r="9" fill="#e8d6b8"/><circle cx="15" cy="31" r="5" fill="${pigment.hex}"/><circle cx="15" cy="31" r="3" fill="#7cc8d8" opacity=".7"/>`
      : "",
    skillSlots.includes("side")
      ? `<circle cx="50" cy="43" r="6" fill="#d8a849"/><circle cx="50" cy="43" r="2.5" fill="${pigment.shadow}" opacity=".55"/>`
      : "",
    skillSlots.includes("badge")
      ? `<rect x="47" y="24" width="11" height="17" rx="4" fill="#fff4dc"/><path d="M50 29 H55 M50 33 H54" stroke="#b9ad9b" stroke-width="1.4" stroke-linecap="round"/>`
      : "",
    skillSlots.includes("charm")
      ? `<path d="M31 46 C29 50 29 53 32 55 C35 53 35 50 33 46 Z" fill="#d8a849"/><path d="M32 46 V41" stroke="#9a7331" stroke-width="2" stroke-linecap="round"/>`
      : ""
  ].join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">`,
    `<ellipse cx="${center}" cy="43" rx="24" ry="10" fill="${pigment.shadow}" opacity=".45"/>`,
    antennae,
    head,
    inner,
    skillPieces,
    eyes,
    gear,
    `<ellipse cx="24" cy="22" rx="8" ry="3" fill="${pigment.highlight}" opacity=".48" transform="rotate(-24 24 22)"/>`,
    "</svg>"
  ].join("");
}

export function createLocalId(prefix: string): string {
  const bytes = new Uint8Array(8);
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  const suffix = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `${prefix}_${suffix}`;
}

export function createPairingToken(): string {
  return createLocalId("pair");
}
