extends RefCounted
class_name BotCatalog

const DEFAULT_BOT := {
	"id": "local-default",
	"name": "Clawd",
	"body": "orb",
	"color": "lavender",
	"eye": "glow",
	"race": "builder",
	"skills": ["page-explainer", "article-xray", "repo-reader"],
	"rules": [
		{"id": "concise", "label": "Keep explanations short", "enabled": true},
		{"id": "cite-page", "label": "Refer only to page content", "enabled": true}
	],
	"browserLinkState": {"status": "unpaired"},
	"iconVariant": {"surface": "launcher", "body": "orb", "color": "lavender", "eye": "glow"},
	"starterPresetId": "clawd"
}

const PIGMENTS := {
	"skyBlue": {"label": "Sky Blue", "color": Color("#7db7d4"), "shadow": Color("#4e8098"), "highlight": Color("#b9dceb")},
	"mossGreen": {"label": "Moss Green", "color": Color("#7f9b64"), "shadow": Color("#566d46"), "highlight": Color("#b8c9a6")},
	"brickRed": {"label": "Brick Red", "color": Color("#b75d47"), "shadow": Color("#823f31"), "highlight": Color("#d98d78")},
	"sunGold": {"label": "Sun Gold", "color": Color("#d8a849"), "shadow": Color("#9a7331"), "highlight": Color("#f0cd7a")},
	"lavender": {"label": "Lavender", "color": Color("#aa8ac2"), "shadow": Color("#715b82"), "highlight": Color("#d2b8e1")},
	"chalkWhite": {"label": "Chalk White", "color": Color("#e7dfd2"), "shadow": Color("#b9ad9b"), "highlight": Color("#fff8ec")},
	"charcoal": {"label": "Charcoal", "color": Color("#403d3a"), "shadow": Color("#242220"), "highlight": Color("#6c6660")}
}

const BODY_OPTIONS := [
	{"id": "orb", "label": "Orb", "race": "builder", "starterPresetId": "clawd", "role": "Soft starter"},
	{"id": "gremlin", "label": "Gremlin", "race": "builder", "starterPresetId": "clawd", "role": "Workshop tinkerer"},
	{"id": "scanner", "label": "Scanner", "race": "scout", "starterPresetId": "hermes", "role": "Browser courier"},
	{"id": "sentinel", "label": "Sentinel", "race": "sentinel", "starterPresetId": "clawd", "role": "Guard shape"},
	{"id": "core", "label": "Core", "race": "builder", "starterPresetId": "mote", "role": "Plain helper"}
]

const EYE_OPTIONS := [
	{"id": "dot", "label": "Dot"},
	{"id": "pixel", "label": "Pixel"},
	{"id": "lens", "label": "Lens"},
	{"id": "glow", "label": "Glow"}
]

const SLOT_ORDER := ["eye", "side", "badge"]

const SLOT_LABELS := {
	"eye": "EYE",
	"side": "SIDE",
	"badge": "BADGE",
	"crown": "CROWN",
	"charm": "CHARM"
}

const SKILL_DEFS := {
	"article-xray": {"slot": "eye", "label": "Article X-Ray", "short": "X-RAY"},
	"repo-reader": {"slot": "side", "label": "Repo Reader", "short": "REPO"},
	"page-explainer": {"slot": "badge", "label": "Page Explainer", "short": "EXPLAIN"}
}

const SLOT_DEFAULT_SKILLS := {
	"eye": "article-xray",
	"side": "repo-reader",
	"badge": "page-explainer"
}

static func default_bot_identity() -> Dictionary:
	return DEFAULT_BOT.duplicate(true)

static func normalize_bot_identity(raw: Dictionary) -> Dictionary:
	var normalized := default_bot_identity()
	if raw.is_empty():
		return normalized
	for key in raw.keys():
		normalized[key] = raw[key]
	normalized["name"] = str(raw.get("name", normalized["name"])).strip_edges()
	if str(normalized["name"]) == "":
		normalized["name"] = "Clawd"
	var body_id := str(raw.get("body", normalized["body"]))
	if not _has_body(body_id):
		body_id = "orb"
	var color_id := str(raw.get("color", normalized["color"]))
	if not PIGMENTS.has(color_id):
		color_id = "lavender"
	var eye_id := str(raw.get("eye", normalized["eye"]))
	if not _has_eye(eye_id):
		eye_id = "glow"
	normalized["body"] = body_id
	normalized["color"] = color_id
	normalized["eye"] = eye_id
	normalized["race"] = str(raw.get("race", body_info(body_id).get("race", "builder")))
	var raw_skills = raw.get("skills", normalized["skills"])
	var next_skills: Array = []
	if raw_skills is Array:
		for skill_id in raw_skills:
			var skill_key := str(skill_id)
			if SKILL_DEFS.has(skill_key) and not next_skills.has(skill_key):
				next_skills.append(skill_key)
	normalized["skills"] = next_skills if not next_skills.is_empty() else DEFAULT_BOT["skills"].duplicate(true)
	if typeof(normalized.get("browserLinkState", {})) != TYPE_DICTIONARY:
		normalized["browserLinkState"] = {"status": "unpaired"}
	var icon_variant = normalized.get("iconVariant", {})
	if typeof(icon_variant) != TYPE_DICTIONARY:
		icon_variant = {}
	icon_variant["surface"] = str(icon_variant.get("surface", "launcher"))
	icon_variant["body"] = body_id
	icon_variant["color"] = color_id
	icon_variant["eye"] = eye_id
	normalized["iconVariant"] = icon_variant
	return normalized

static func body_info(body_id: String) -> Dictionary:
	for option in BODY_OPTIONS:
		if str(option["id"]) == body_id:
			return option.duplicate(true)
	return BODY_OPTIONS[0].duplicate(true)

static func eye_info(eye_id: String) -> Dictionary:
	for option in EYE_OPTIONS:
		if str(option["id"]) == eye_id:
			return option.duplicate(true)
	return EYE_OPTIONS[0].duplicate(true)

static func pigment_info(color_id: String) -> Dictionary:
	return PIGMENTS.get(color_id, PIGMENTS["lavender"]).duplicate(true)

static func body_options() -> Array:
	var options: Array = []
	for option in BODY_OPTIONS:
		options.append(option.duplicate(true))
	return options

static func eye_options() -> Array:
	var options: Array = []
	for option in EYE_OPTIONS:
		options.append(option.duplicate(true))
	return options

static func color_ids() -> Array:
	return ["lavender", "mossGreen", "skyBlue", "brickRed", "sunGold", "chalkWhite", "charcoal"]

static func slot_order() -> Array:
	return SLOT_ORDER.duplicate(true)

static func slot_label(slot_id: String) -> String:
	return str(SLOT_LABELS.get(slot_id, slot_id.to_upper()))

static func equipped_skill_for_slot(bot: Dictionary, slot_id: String) -> String:
	var skills = bot.get("skills", [])
	if skills is Array:
		for skill_id in skills:
			var skill_key := str(skill_id)
			if str(skill_info(skill_key).get("slot", "")) == slot_id:
				return skill_key
	return ""

static func skill_info(skill_id: String) -> Dictionary:
	return SKILL_DEFS.get(skill_id, {"slot": "", "label": "Unknown", "short": "EMPTY"}).duplicate(true)

static func skill_label(skill_id: String) -> String:
	return str(skill_info(skill_id).get("label", "Unknown"))

static func skill_short_label(skill_id: String) -> String:
	return str(skill_info(skill_id).get("short", "EMPTY"))

static func default_skill_for_slot(slot_id: String) -> String:
	return str(SLOT_DEFAULT_SKILLS.get(slot_id, ""))

static func set_slot_equipped(bot: Dictionary, slot_id: String, enabled: bool) -> Dictionary:
	var next_bot := normalize_bot_identity(bot)
	var next_skills: Array = []
	var skills = next_bot.get("skills", [])
	if skills is Array:
		for skill_id in skills:
			var skill_key := str(skill_id)
			if str(skill_info(skill_key).get("slot", "")) != slot_id:
				next_skills.append(skill_key)
	if enabled:
		var replacement := default_skill_for_slot(slot_id)
		if replacement != "":
			next_skills.append(replacement)
	next_bot["skills"] = next_skills
	return normalize_bot_identity(next_bot)

static func format_identity_meta(bot: Dictionary) -> String:
	return "%s / %s / %s" % [body_label(str(bot.get("body", "orb"))), pigment_label(str(bot.get("color", "lavender"))), eye_label(str(bot.get("eye", "glow")))]

static func format_loadout_meta(bot: Dictionary) -> String:
	var parts: Array[String] = []
	for slot_id in SLOT_ORDER:
		var skill_id := equipped_skill_for_slot(bot, slot_id)
		if skill_id != "":
			parts.append("%s %s" % [slot_label(slot_id), skill_short_label(skill_id)])
	return " / ".join(parts) if not parts.is_empty() else "NO PARTS FITTED"

static func pigment_label(color_id: String) -> String:
	return str(pigment_info(color_id).get("label", "Lavender")).to_upper()

static func body_label(body_id: String) -> String:
	return str(body_info(body_id).get("label", "Orb")).to_upper()

static func eye_label(eye_id: String) -> String:
	return str(eye_info(eye_id).get("label", "Glow")).to_upper()

static func build_identity_change(bot: Dictionary, field: String, value) -> Dictionary:
	var next_bot := normalize_bot_identity(bot)
	match field:
		"body":
			var body_id := str(value)
			var info := body_info(body_id)
			next_bot["body"] = str(info.get("id", "orb"))
			next_bot["race"] = str(info.get("race", "builder"))
			next_bot["starterPresetId"] = str(info.get("starterPresetId", "clawd"))
		"color":
			next_bot["color"] = str(value)
		"eye":
			next_bot["eye"] = str(value)
	return normalize_bot_identity(next_bot)

static func _has_body(body_id: String) -> bool:
	for option in BODY_OPTIONS:
		if str(option["id"]) == body_id:
			return true
	return false

static func _has_eye(eye_id: String) -> bool:
	for option in EYE_OPTIONS:
		if str(option["id"]) == eye_id:
			return true
	return false
