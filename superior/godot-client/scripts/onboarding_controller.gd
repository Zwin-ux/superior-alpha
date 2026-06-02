extends Control
class_name OnboardingController

const SFX_PLAYER := preload("res://scripts/sfx_player.gd")
const FACTORY_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-clay-factory-atlas.json"
const OWNERSHIP_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-spore-ownership-atlas.json"
const BROWSER_HAND_LABEL := "CHROME HAND"
const SPORE_NAME := "CLAWD"
const LEGACY_CHECK_TEXT := "REGISTER / Local Ollama / OpenAI BYOK / SAVE SPORE / BUILDER RACE"

const STEPS := [
	{
		"id": "wake",
		"title": "WAKE",
		"primary": "SIGNAL FOUND",
		"detail": "lamp on / eyes open",
		"stamp": "SPORE / AWAKE"
	},
	{
		"id": "body",
		"title": "BODY",
		"primary": "CHOOSE BODY",
		"detail": "Orb / Scanner / Gremlin / Sentinel / Clawdbot",
		"stamp": "BODY / SELECTED"
	},
	{
		"id": "eye",
		"title": "EYE",
		"primary": "FIT EYE",
		"detail": "X-Ray Eye / reads structure",
		"stamp": "EYE / ATTACHED"
	},
	{
		"id": "role",
		"title": "ROLE",
		"primary": "BUILDER ROLE",
		"detail": "badge / project work",
		"stamp": "ROLE / STAMPED"
	},
	{
		"id": "browser",
		"title": "BROWSER",
		"primary": "BIND BROWSER HAND",
		"detail": "Chrome detected / extension ready",
		"stamp": "ICON / MATCHED"
	},
	{
		"id": "stamp",
		"title": "STAMP",
		"primary": "ARTICLE X-RAY",
		"detail": "eye pulses / spore reacts",
		"stamp": "SPORE / STAMPED"
	}
]

const STARTERS := [
	{
		"id": "orb",
		"name": "ORB",
		"body": "ORB",
		"pigment": "LAVENDER",
		"eye": "GLOW",
		"line": "soft helper",
		"color": Color("#a18ab8"),
		"asset": ""
	},
	{
		"id": "scanner",
		"name": "SCANNER",
		"body": "SCANNER",
		"pigment": "SKY",
		"eye": "LENS",
		"line": "signal reader",
		"color": Color("#6fa0b7"),
		"asset": ""
	},
	{
		"id": "gremlin",
		"name": "GREMLIN",
		"body": "GREMLIN",
		"pigment": "MOSS",
		"eye": "PIXEL",
		"line": "scrappy builder",
		"color": Color("#6f8d58"),
		"asset": "bot.clawd.body"
	},
	{
		"id": "sentinel",
		"name": "SENTINEL",
		"body": "SENTINEL",
		"pigment": "BRICK",
		"eye": "RADAR",
		"line": "careful guard",
		"color": Color("#a95442"),
		"asset": ""
	},
	{
		"id": "clawdbot",
		"name": "CLAWDBOT",
		"body": "CLAWDBOT",
		"pigment": "CHALK",
		"eye": "DEBUG",
		"line": "system buddy",
		"color": Color("#d6c6a3"),
		"asset": ""
	}
]

const SKILL_SLOTS := [
	["EYE SLOT", "X-RAY", "bot.clawd.skill.eye"],
	["BADGE SLOT", "EXPLAIN", "bot.clawd.skill.badge"],
	["SIDE TOOL", "REPO", "bot.clawd.skill.side"],
	["CROWN SLOT", "CITE", ""],
	["CHARM SLOT", "WATCH", ""]
]

var step_index := 0
var selected_starter_index := 2
var elapsed := 0.0
var auto_demo := false
var showcase_mode := false
var factory_atlas: Texture2D
var factory_image: Image
var ownership_atlas: Texture2D
var ownership_image: Image
var factory_textures: Dictionary = {}

var title_label: Label
var primary_label: Label
var detail_label: Label
var stamp_label: Label
var step_label: Label
var selected_label: Label
var progress_fill: ColorRect
var bench_glow: ColorRect
var wake_dim: ColorRect
var spore_seed: TextureRect
var bot_body: TextureRect
var bot_fallback: ColorRect
var eye_panel: TextureRect
var eye_fallback_l: ColorRect
var eye_fallback_r: ColorRect
var save_stamp: Label
var skill_ran_label: Label
var registry_card: TextureRect
var registry_title_label: Label
var registry_handle_label: Label
var registry_code_label: Label
var registry_icon_label: Label
var registry_seal_label: Label
var menu_slabs: Array[TextureRect] = []
var menu_labels: Array[Label] = []
var menu_step_lights: Array[ColorRect] = []
var body_choice_nodes: Array[CanvasItem] = []
var body_choice_cards: Array[TextureRect] = []
var body_choice_labels: Array[Label] = []
var starter_plates: Array[TextureRect] = []
var starter_labels: Array[Label] = []
var tray_shell_nodes: Array[CanvasItem] = []
var parts_tray_title_label: Label
var slot_rows: Array[TextureRect] = []
var slot_labels: Array[Label] = []
var slot_lights: Array[ColorRect] = []
var skill_parts: Array[TextureRect] = []
var browser_dock_nodes: Array[CanvasItem] = []
var browser_card: TextureRect
var browser_cable: TextureRect
var browser_ext_label: Label
var browser_default_icon: TextureRect
var browser_default_eye_l: ColorRect
var browser_default_eye_r: ColorRect
var browser_icon_body: TextureRect
var browser_icon_eyes: TextureRect
var browser_icon_skill: TextureRect
var browser_icon_flash: TextureRect
var browser_status_label: Label
var browser_ping_label: Label
var save_stamp_plate: TextureRect
var dust_particles: Array[ColorRect] = []
var attachment_points: Array[ColorRect] = []
var status_pills: Array[TextureRect] = []
var status_leds: Array[ColorRect] = []
var status_labels: Array[Label] = []
var sfx_player
var step_flash_timer := 0.0

func _ready() -> void:
	showcase_mode = OS.get_environment("SUPERIOR_SHOWCASE") == "1"
	auto_demo = OS.get_environment("SUPERIOR_VIDEO_PROOF") == "1"
	factory_image = _load_png_image("res://assets/clay/superior-clay-factory-atlas.png")
	if factory_image:
		factory_atlas = ImageTexture.create_from_image(factory_image)
	ownership_image = _load_png_image("res://assets/clay/superior-spore-ownership-atlas.png")
	if ownership_image:
		ownership_atlas = ImageTexture.create_from_image(ownership_image)
	_load_factory_manifest()
	_load_ownership_manifest()
	_build_screen()
	_build_sfx()
	_render_step()
	sfx_player.play_sfx("boot_wake", 0.55)

func _process(delta: float) -> void:
	elapsed += delta
	if step_flash_timer > 0.0:
		step_flash_timer = max(0.0, step_flash_timer - delta)
	_update_motion()
	_update_time_based_labels()
	if auto_demo and elapsed > _auto_step_seconds():
		_advance()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ENTER or event.keycode == KEY_SPACE:
			_advance()
		if event.keycode == KEY_ESCAPE:
			get_tree().change_scene_to_file("res://scenes/ClayWorkshop.tscn")
		if _current_step_id() == "body":
			if event.keycode == KEY_1:
				_select_starter(0)
			if event.keycode == KEY_2:
				_select_starter(1)
			if event.keycode == KEY_3:
				_select_starter(2)
			if event.keycode == KEY_4:
				_select_starter(3)
			if event.keycode == KEY_5:
				_select_starter(4)

func _advance() -> void:
	elapsed = 0.0
	if _current_step_id() == "body":
		_select_starter(selected_starter_index)
	if step_index < STEPS.size() - 1:
		step_index += 1
		step_flash_timer = 0.38
		_render_step()
		_play_step_sfx(_current_step_id())
		return

	_save_setup_complete()
	get_tree().change_scene_to_file("res://scenes/SporeGarden.tscn")

func _current_step_id() -> String:
	return str(STEPS[step_index]["id"])

func _select_starter(index: int) -> void:
	selected_starter_index = clamp(index, 0, STARTERS.size() - 1)
	_render_step()
	if sfx_player:
		sfx_player.play_sfx("select", 0.8)

func _auto_step_seconds() -> float:
	return 1.55 if showcase_mode else 1.72

func _build_sfx() -> void:
	sfx_player = SFX_PLAYER.new()
	add_child(sfx_player)

func _play_step_sfx(step_id: String) -> void:
	if not sfx_player:
		return
	match step_id:
		"body":
			sfx_player.play_sfx("select", 0.85)
		"eye":
			sfx_player.play_sfx("attach", 0.9)
		"role":
			sfx_player.play_sfx("attach", 0.78)
		"browser":
			sfx_player.play_sfx("browser_bind", 0.9)
		"stamp":
			sfx_player.play_sfx("stamp", 0.88)
		_:
			sfx_player.play_sfx("step", 0.7)

func _render_step() -> void:
	var step: Dictionary = STEPS[step_index]
	var step_id := _current_step_id()
	title_label.text = str(step["title"])
	primary_label.text = str(step["primary"])
	detail_label.text = str(step["detail"])
	stamp_label.text = str(step["stamp"])
	step_label.text = "%02d / %02d" % [step_index + 1, STEPS.size()]
	progress_fill.size = Vector2(460.0 * float(step_index + 1) / float(STEPS.size()), 8)

	for index in range(menu_slabs.size()):
		var active := index == step_index
		var complete := index < step_index
		var next_step := index == step_index + 1
		menu_slabs[index].texture = _factory_texture("scene.menu-slab.pressed" if active or complete else "scene.menu-slab.default")
		menu_slabs[index].scale = Vector2(1.035, 0.96) if active else Vector2(0.99, 0.99) if complete else Vector2.ONE
		menu_slabs[index].modulate = Color("#fff2bb") if active else Color("#e1c985") if complete else Color("#b9a17a") if next_step else Color("#766a5d")
		menu_labels[index].text = _rail_label(index)
		if complete:
			menu_labels[index].add_theme_color_override("font_color", Color("#d9ffb0"))
		elif active:
			menu_labels[index].add_theme_color_override("font_color", Color("#fff0a8"))
		else:
			menu_labels[index].add_theme_color_override("font_color", Color("#5f4b34"))
		if index < menu_step_lights.size():
			menu_step_lights[index].color = Color("#72d968") if complete else Color("#ffd36b") if active else Color("#6b6259") if next_step else Color("#2b261f")
			menu_step_lights[index].size = Vector2(13, 13) if active else Vector2(10, 10)

	for index in range(starter_plates.size()):
		var selected := index == selected_starter_index
		starter_plates[index].texture = _factory_texture("scene.menu-slab.pressed" if selected else "scene.menu-slab.default")
		starter_plates[index].visible = step_id == "body"
		starter_labels[index].visible = step_id == "body"
		starter_labels[index].add_theme_color_override("font_color", Color("#f7e2a8") if selected else Color("#23170f"))
	_update_body_choices(step_id)

	_set_tray_shell_visible(step_id != "wake" and step_id != "browser")
	_set_status_visible(step_id == "browser" or step_id == "stamp")
	if parts_tray_title_label:
		parts_tray_title_label.text = _tray_title(step_id)

	var has_body := _body_is_on_bench()
	spore_seed.visible = step_id == "wake"
	bot_body.visible = has_body and step_id != "body" and str(STARTERS[selected_starter_index]["asset"]) != ""
	bot_fallback.visible = has_body and step_id != "body" and str(STARTERS[selected_starter_index]["asset"]) == ""
	eye_panel.visible = _eye_is_equipped() and str(STARTERS[selected_starter_index]["asset"]) != ""
	eye_fallback_l.visible = _eye_is_equipped() and str(STARTERS[selected_starter_index]["asset"]) == ""
	eye_fallback_r.visible = _eye_is_equipped() and str(STARTERS[selected_starter_index]["asset"]) == ""
	bot_fallback.color = STARTERS[selected_starter_index]["color"]

	var starter: Dictionary = STARTERS[selected_starter_index]
	if has_body:
		selected_label.text = SPORE_NAME
		if step_id == "body":
			selected_label.text = "PICK CLAWD"
			detail_label.text = "Gremlin / Moss / Pixel  -  scrappy builder"
		if step_id == "browser":
			detail_label.text = "Browser Hand / icon match"
		elif step_id == "stamp":
			detail_label.text = "Article X-Ray / icon match / stamp"
		elif step_id != "body":
			detail_label.text = "%s / %s / %s  -  %s" % [
				str(starter["body"]),
				str(starter["pigment"]),
				str(starter["eye"]),
				str(starter.get("line", "starter body"))
			]
	else:
		selected_label.text = "NEW SPORE"
		detail_label.text = str(step["detail"])

	_update_registry_plate(step_id)

	for index in range(slot_rows.size()):
		var slot_state := _slot_state(index)
		var active_slot := slot_state == "EQUIPPED" or slot_state == "READY"
		var visible_slot := _slot_visible(index, step_id)
		slot_rows[index].visible = visible_slot
		slot_labels[index].visible = visible_slot
		if index < slot_lights.size():
			slot_lights[index].visible = visible_slot
		slot_rows[index].texture = _factory_texture("scene.tray-slot.equipped" if active_slot else "scene.tray-slot.empty")
		slot_rows[index].modulate = Color("#fff0b1") if slot_state == "READY" else Color("#dff7aa") if slot_state == "EQUIPPED" else Color("#a99477") if slot_state == "STOWED" else Color("#766a5d")
		slot_labels[index].text = _slot_label_text(index, slot_state)
		if index < slot_lights.size():
			slot_lights[index].color = Color("#72d968") if slot_state == "EQUIPPED" else Color("#ffd36b") if slot_state == "READY" else Color("#3b352d")
		if slot_state == "EQUIPPED":
			slot_labels[index].add_theme_color_override("font_color", Color("#1f160f"))
		elif slot_state == "READY":
			slot_labels[index].add_theme_color_override("font_color", Color("#7a4b22"))
		else:
			slot_labels[index].add_theme_color_override("font_color", Color("#7b6a54"))

	for index in range(skill_parts.size()):
		skill_parts[index].visible = (index == 0 and _eye_is_equipped()) or (index == 1 and _role_is_equipped()) or (index == 2 and _browser_is_bound())

	for point in attachment_points:
		point.visible = has_body

	save_stamp.visible = step_id == "stamp"
	if save_stamp_plate:
		save_stamp_plate.visible = step_id == "stamp"
	if skill_ran_label:
		skill_ran_label.visible = false
	if wake_dim:
		wake_dim.visible = step_id == "wake"
		wake_dim.color = Color(0.03, 0.02, 0.015, max(0.0, 0.48 - elapsed * 0.22))
	_set_browser_dock_visible(step_id == "browser" or step_id == "stamp")
	_sync_browser_transfer_visuals()
	if browser_status_label:
		browser_status_label.text = "ICON MATCH" if step_id == "stamp" else "CHROME DETECTED"
	if browser_ping_label:
		browser_ping_label.text = "BROWSER LINKED" if step_id == "stamp" else "EXTENSION READY"
	_update_status_leds()

func _update_registry_plate(step_id: String) -> void:
	var show_registry := step_id == "stamp"
	registry_card.visible = show_registry
	registry_title_label.visible = show_registry
	registry_handle_label.visible = show_registry
	registry_code_label.visible = show_registry
	registry_icon_label.visible = show_registry
	registry_seal_label.visible = show_registry
	if not show_registry:
		return

	var starter: Dictionary = STARTERS[selected_starter_index]
	registry_title_label.text = "SPORE REGISTRY"
	registry_handle_label.text = "NAME    CLAWD"
	registry_code_label.text = "MODEL   %s" % str(starter["body"])
	registry_icon_label.text = "TOOL    BROWSER HAND"
	registry_seal_label.text = "X-RAY"

func _body_is_on_bench() -> bool:
	var step_id := _current_step_id()
	return step_id == "body" or step_id == "eye" or step_id == "role" or step_id == "browser" or step_id == "stamp"

func _eye_is_equipped() -> bool:
	var step_id := _current_step_id()
	return step_id == "eye" or step_id == "role" or step_id == "browser" or step_id == "stamp"

func _role_is_equipped() -> bool:
	var step_id := _current_step_id()
	return step_id == "role" or step_id == "browser" or step_id == "stamp"

func _browser_is_bound() -> bool:
	var step_id := _current_step_id()
	return step_id == "browser" or step_id == "stamp"

func _slot_state(index: int) -> String:
	var step_id := _current_step_id()
	if index == 0:
		if _eye_is_equipped():
			return "EQUIPPED"
		return "READY" if step_id == "eye" else "EMPTY"
	if index == 1:
		if _role_is_equipped():
			return "EQUIPPED"
		return "READY" if step_id == "role" else "EMPTY"
	if index == 2:
		if _browser_is_bound():
			return "EQUIPPED"
		return "READY" if step_id == "browser" else "EMPTY"
	if index == 3 or index == 4:
		return "STOWED" if step_id == "stamp" else "EMPTY"
	return "EMPTY"

func _slot_visible(index: int, step_id: String) -> bool:
	if step_id == "eye":
		return index == 0
	if step_id == "role":
		return index <= 1
	if step_id == "browser":
		return false
	if step_id == "stamp":
		return index <= 2
	return false

func _slot_label_text(index: int, state: String) -> String:
	var slot := str(SKILL_SLOTS[index][0]).replace(" SLOT", "")
	var part := str(SKILL_SLOTS[index][1])
	if state == "EMPTY":
		return "%s  EMPTY" % slot
	if state == "STOWED":
		return "%s  STOWED" % slot
	return "%s  %s" % [slot, part]

func _update_body_choices(step_id: String) -> void:
	var show_choices := step_id == "body"
	for node in body_choice_nodes:
		node.visible = show_choices
	if not show_choices:
		return
	for index in range(body_choice_cards.size()):
		var selected := index == 1
		body_choice_cards[index].texture = _factory_texture("scene.tray-slot.equipped" if selected else "scene.tray-slot.empty")
		body_choice_cards[index].scale = Vector2(1.08, 1.08) if selected else Vector2.ONE
		body_choice_labels[index].add_theme_color_override("font_color", Color("#ffe7a2") if selected else Color("#d7c999"))

func _tray_title(step_id: String) -> String:
	if step_id == "body":
		return "STARTER PLATES"
	if step_id == "eye":
		return "EYE MODULE"
	if step_id == "role":
		return "ROLE BADGE"
	if step_id == "browser":
		return "BROWSER HAND"
	if step_id == "stamp":
		return "SPORE KIT"
	return "SPORE KIT"

func _rail_label(index: int) -> String:
	var label := str(STEPS[index]["title"])
	return "%02d %s" % [index + 1, label]

func _update_status_leds() -> void:
	var step_id := _current_step_id()
	var browser_ready := _browser_is_bound() and (step_id != "browser" or elapsed > 0.92)
	var workshop_ready := step_id == "stamp" and elapsed > 1.08
	var labels := [
		"DAEMON READY",
		"MODEL LOCAL",
		"BROWSER LINKED" if browser_ready else "BROWSER WAIT",
		"WORKSHOP OPEN" if workshop_ready else "WORKSHOP LOCK"
	]
	var colors := [
		Color("#69b65b"),
		Color("#69b65b"),
		Color("#69b65b") if browser_ready else Color("#7b746a"),
		Color("#69b65b") if workshop_ready else Color("#7b746a")
	]
	if step_id == "browser":
		colors[2] = Color("#69b65b") if browser_ready else Color("#d6a841")
		labels[2] = "BROWSER LINKED" if browser_ready else "BROWSER PAIR"
	if step_id == "stamp" and elapsed > 0.48 and elapsed <= 1.08:
		colors[3] = Color("#d6a841")
		labels[3] = "SKILL RAN"
	for index in range(status_labels.size()):
		status_labels[index].text = labels[index]
		status_leds[index].color = colors[index]

func _set_status_visible(visible: bool) -> void:
	for node in status_pills:
		node.visible = visible
	for node in status_leds:
		node.visible = visible
	for node in status_labels:
		node.visible = visible

func _update_time_based_labels() -> void:
	var step_id := _current_step_id()
	if step_id == "browser":
		if elapsed > 0.94:
			primary_label.text = "ICON MATCH"
			stamp_label.text = "BROWSER LINKED"
			if browser_status_label:
				browser_status_label.text = "ICON MATCH"
			if browser_ping_label:
				browser_ping_label.text = "BROWSER LINKED"
		else:
			primary_label.text = "BIND BROWSER HAND"
			stamp_label.text = "ICON / MATCHING"
			if browser_status_label:
				browser_status_label.text = "CHROME DETECTED"
			if browser_ping_label:
				browser_ping_label.text = "EXTENSION READY"
	elif step_id == "stamp":
		if elapsed > 0.48:
			primary_label.text = "SKILL RAN"
			if skill_ran_label:
				skill_ran_label.visible = true
		if elapsed > 1.06:
			stamp_label.text = "WORKSHOP / OPEN"
			if registry_seal_label:
				registry_seal_label.text = "STAMPED"
	else:
		if skill_ran_label:
			skill_ran_label.visible = false
	_update_status_leds()

func _build_screen() -> void:
	var background := ColorRect.new()
	background.color = Color("#070604")
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	_add_texture("scene.wall", Vector2(294, 62), Vector2(692, 390), "OnboardingWall")
	_add_texture("scene.table", Vector2(-8, 420), Vector2(1296, 300), "OnboardingTable")
	_add_texture("scene.lamp", Vector2(550, 28), Vector2(180, 132), "OnboardingLamp")
	_add_texture("scene.menu-slab.default", Vector2(430, 116), Vector2(420, 78), "OnboardingRegistrySign")
	_add_texture("scene.menu-slab.pressed", Vector2(496, 188), Vector2(288, 42), "OnboardingRegistrySubsign")
	_add_label("SUPERIOR", Vector2(484, 126), Vector2(312, 44), 38, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_add_label("SPORE REGISTRY", Vector2(520, 196), Vector2(240, 24), 17, Color("#f7e2a8"), HORIZONTAL_ALIGNMENT_CENTER)

	bench_glow = ColorRect.new()
	bench_glow.color = Color(1.0, 0.76, 0.34, 0.10)
	bench_glow.position = Vector2(458, 206)
	bench_glow.size = Vector2(364, 330)
	add_child(bench_glow)

	_build_left_machine()
	_build_bench()
	_build_parts_tray()
	_build_bottom_card()
	_build_dust()
	wake_dim = ColorRect.new()
	wake_dim.name = "WakeDimmer"
	wake_dim.color = Color(0.03, 0.02, 0.015, 0.42)
	wake_dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	wake_dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(wake_dim)
	_add_crt_pass()

func _build_left_machine() -> void:
	_add_texture("scene.left-rail", Vector2(68, 112), Vector2(250, 432), "SetupRail")
	var labels := ["WAKE", "BODY", "EYE", "ROLE", "BROWSER", "STAMP"]
	for index in range(labels.size()):
		var y := 170 + index * 54
		var slab := _add_texture("scene.menu-slab.default", Vector2(108, y), Vector2(172, 46), "SetupStep%s" % index)
		slab.pivot_offset = Vector2(86, 23)
		var label := _add_label("%02d %s" % [index + 1, labels[index]], Vector2(136, y + 10), Vector2(132, 24), 15, Color("#23170f"), HORIZONTAL_ALIGNMENT_LEFT)
		var step_light := _add_dot(Vector2(116, y + 16), Color("#2b261f"), "SetupStepLight%s" % index)
		step_light.size = Vector2(10, 10)
		menu_slabs.append(slab)
		menu_labels.append(label)
		menu_step_lights.append(step_light)

	step_label = _add_label("SETUP RAIL", Vector2(112, 130), Vector2(168, 24), 15, Color("#d7c999"), HORIZONTAL_ALIGNMENT_CENTER)

func _build_bench() -> void:
	_add_texture("scene.pedestal", Vector2(458, 388), Vector2(366, 154), "SetupPedestal")

	registry_card = _add_texture("scene.bottom-card", Vector2(492, 228), Vector2(300, 178), "SporeRegistryCard")
	registry_title_label = _add_label("SPORE REGISTRY", Vector2(522, 246), Vector2(238, 24), 17, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	registry_handle_label = _add_label("HANDLE  PLAYER-01", Vector2(526, 286), Vector2(228, 18), 13, Color("#4f3927"), HORIZONTAL_ALIGNMENT_LEFT)
	registry_code_label = _add_label("EMAIL   CODE READY", Vector2(526, 312), Vector2(228, 18), 13, Color("#4f3927"), HORIZONTAL_ALIGNMENT_LEFT)
	registry_icon_label = _add_label("ICON    PENDING", Vector2(526, 338), Vector2(228, 18), 13, Color("#4f3927"), HORIZONTAL_ALIGNMENT_LEFT)
	registry_seal_label = _add_label("REGISTER", Vector2(586, 370), Vector2(108, 24), 16, Color("#9b5f38"), HORIZONTAL_ALIGNMENT_CENTER)

	spore_seed = _add_texture("boot.seed", Vector2(560, 262), Vector2(160, 160), "EmptySporeSeed")
	spore_seed.pivot_offset = Vector2(80, 80)

	bot_body = _add_texture("bot.clawd.body", Vector2(506, 224), Vector2(270, 270), "StarterClawdBody")
	bot_body.pivot_offset = Vector2(135, 135)
	bot_body.visible = false

	eye_panel = _add_texture("bot.clawd.eye.pixel", Vector2(560, 318), Vector2(160, 80), "StarterPixelEyes")
	eye_panel.visible = false

	bot_fallback = ColorRect.new()
	bot_fallback.name = "StarterFallbackBody"
	bot_fallback.position = Vector2(578, 282)
	bot_fallback.size = Vector2(124, 124)
	bot_fallback.visible = false
	add_child(bot_fallback)

	eye_fallback_l = _add_dot(Vector2(620, 332), Color("#dff8ff"), "StarterFallbackEyeLeft")
	eye_fallback_r = _add_dot(Vector2(656, 332), Color("#dff8ff"), "StarterFallbackEyeRight")
	eye_fallback_l.visible = false
	eye_fallback_r.visible = false
	_build_body_starter_stage()

	for spec in [
		[Vector2(536, 338), "AttachmentPointEye"],
		[Vector2(724, 338), "AttachmentPointBadge"],
		[Vector2(512, 416), "AttachmentPointSide"]
	]:
		var point := _add_dot(spec[0], Color("#ffe7a2"), str(spec[1]))
		point.size = Vector2(8, 8)
		point.visible = false
		attachment_points.append(point)

	var skill_specs := [
		["bot.clawd.skill.eye", Vector2(508, 318), Vector2(62, 62), "EyeSkillPart"],
		["bot.clawd.skill.badge", Vector2(708, 312), Vector2(60, 60), "BadgeSkillPart"],
		["bot.clawd.skill.side", Vector2(492, 380), Vector2(62, 62), "SideSkillPart"]
	]
	for spec in skill_specs:
		var part := _add_texture(str(spec[0]), spec[1], spec[2], str(spec[3]))
		part.visible = false
		part.pivot_offset = spec[2] * 0.5
		skill_parts.append(part)

	save_stamp_plate = _add_texture("ownership.spore-stamp", Vector2(458, 504), Vector2(364, 122), "SporeStampedPlate")
	save_stamp_plate.visible = false
	save_stamp = _add_label("SPORE STAMPED", Vector2(514, 548), Vector2(252, 30), 24, Color("#ffd88a"), HORIZONTAL_ALIGNMENT_CENTER)
	save_stamp.visible = false
	skill_ran_label = _add_label("SKILL RAN", Vector2(532, 478), Vector2(216, 28), 24, Color("#dff8ff"), HORIZONTAL_ALIGNMENT_CENTER)
	skill_ran_label.visible = false
	_build_browser_hand()

func _build_body_starter_stage() -> void:
	var specs := [
		{
			"title": "ORB",
			"line": "SOFT HELPER",
			"asset": "boot.seed",
			"position": Vector2(404, 278),
			"size": Vector2(128, 128),
			"color": Color("#a78bb8"),
			"plate": Vector2(382, 404)
		},
		{
			"title": "CLAWD",
			"line": "SCRAPPY BUILDER",
			"asset": "bot.clawd.body",
			"position": Vector2(530, 224),
			"size": Vector2(222, 222),
			"color": Color("#ffffff"),
			"plate": Vector2(500, 414)
		},
		{
			"title": "SCANNER",
			"line": "SIGNAL READER",
			"asset": "boot.seed",
			"position": Vector2(760, 276),
			"size": Vector2(132, 132),
			"color": Color("#6fa0b7"),
			"plate": Vector2(748, 404)
		}
	]

	for index in range(specs.size()):
		var spec: Dictionary = specs[index]
		var selected := index == 1
		var plate := _add_texture("scene.tray-slot.equipped" if selected else "scene.tray-slot.empty", spec["plate"], Vector2(156, 58), "BodyStarterPlate%s" % index)
		plate.pivot_offset = Vector2(78, 29)
		body_choice_cards.append(plate)
		_remember_body_choice_node(plate)

		var body := _add_texture(str(spec["asset"]), spec["position"], spec["size"], "BodyStarter%s" % index)
		body.modulate = spec["color"]
		body.pivot_offset = spec["size"] * 0.5
		if not selected:
			body.modulate.a = 0.72
		_remember_body_choice_node(body)

		if index == 2:
			var lens := _add_dot(Vector2(813, 326), Color("#e2f8ff"), "ScannerStarterLens")
			lens.size = Vector2(20, 20)
			_remember_body_choice_node(lens)

		var title := _add_label(str(spec["title"]), spec["plate"] + Vector2(10, 8), Vector2(136, 18), 15, Color("#ffe7a2") if selected else Color("#d7c999"), HORIZONTAL_ALIGNMENT_CENTER)
		body_choice_labels.append(title)
		_remember_body_choice_node(title)
		var line := _add_label(str(spec["line"]), spec["plate"] + Vector2(8, 30), Vector2(140, 16), 9, Color("#4e3a29"), HORIZONTAL_ALIGNMENT_CENTER)
		_remember_body_choice_node(line)

func _build_browser_hand() -> void:
	browser_cable = _add_texture("ownership.chrome-cable", Vector2(646, 326), Vector2(246, 34), "ChromeHandCable")
	_remember_browser_node(browser_cable)

	browser_card = _add_texture("ownership.chrome-hand.dock", Vector2(698, 188), Vector2(322, 278), "ChromeHandDock")
	_remember_browser_node(browser_card)
	_remember_browser_node(_add_label("PAIR BROWSER HAND", Vector2(748, 240), Vector2(218, 22), 15, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER))

	var toolbar := _add_texture("ownership.chrome-toolbar.slot", Vector2(742, 280), Vector2(220, 96), "ChromeToolbarSlot")
	_remember_browser_node(toolbar)

	browser_ext_label = _add_label("EXT", Vector2(772, 322), Vector2(38, 16), 11, Color("#5a422f"), HORIZONTAL_ALIGNMENT_LEFT)
	_remember_browser_node(browser_ext_label)

	browser_default_icon = _add_texture("ownership.chrome-icon.default", Vector2(850, 298), Vector2(66, 66), "DefaultExtensionIcon")
	_remember_browser_node(browser_default_icon)

	browser_default_eye_l = _add_dot(Vector2(874, 322), Color("#ffe1a4"), "DefaultExtensionEyeLeft")
	browser_default_eye_l.size = Vector2(6, 6)
	_remember_browser_node(browser_default_eye_l)
	browser_default_eye_r = _add_dot(Vector2(890, 322), Color("#ffe1a4"), "DefaultExtensionEyeRight")
	browser_default_eye_r.size = Vector2(6, 6)
	_remember_browser_node(browser_default_eye_r)

	browser_icon_flash = _add_texture("ownership.icon-match.flash", Vector2(720, 252), Vector2(276, 156), "IconMatchFlash")
	_remember_browser_node(browser_icon_flash)

	browser_icon_body = _add_texture("ownership.chrome-icon.clawd", Vector2(816, 270), Vector2(136, 136), "ChromeClawdIconBody")
	browser_icon_body.pivot_offset = Vector2(68, 68)
	_remember_browser_node(browser_icon_body)
	browser_icon_eyes = _add_texture("bot.clawd.icon-eye.pixel", Vector2(854, 327), Vector2(62, 31), "ChromeClawdIconEyes")
	_remember_browser_node(browser_icon_eyes)
	browser_icon_skill = _add_texture("bot.clawd.icon-skill.xray", Vector2(822, 328), Vector2(46, 46), "ChromeClawdIconLens")
	browser_icon_skill.pivot_offset = Vector2(23, 23)
	_remember_browser_node(browser_icon_skill)

	browser_status_label = _add_label("CHROME DETECTED", Vector2(762, 394), Vector2(190, 20), 13, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_status_label)
	browser_ping_label = _add_label("EXTENSION READY", Vector2(748, 420), Vector2(218, 18), 11, Color("#8a5e38"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_ping_label)

func _remember_browser_node(node: CanvasItem) -> void:
	node.z_index = 20
	node.visible = false
	browser_dock_nodes.append(node)

func _set_browser_dock_visible(visible: bool) -> void:
	for node in browser_dock_nodes:
		node.visible = visible

func _sync_browser_transfer_visuals() -> void:
	var step_id := _current_step_id()
	var old_icon_alpha := 0.0
	var clawd_icon_alpha := 0.0
	if step_id == "browser":
		old_icon_alpha = 1.0 - smoothstep(0.18, 0.72, elapsed)
		clawd_icon_alpha = smoothstep(0.42, 0.96, elapsed)
	elif step_id == "stamp":
		clawd_icon_alpha = 1.0
	if browser_default_icon:
		browser_default_icon.modulate.a = old_icon_alpha
	if browser_default_eye_l:
		browser_default_eye_l.modulate.a = old_icon_alpha
	if browser_default_eye_r:
		browser_default_eye_r.modulate.a = old_icon_alpha
	if browser_ext_label:
		browser_ext_label.modulate.a = old_icon_alpha
	if browser_icon_body:
		browser_icon_body.modulate.a = clawd_icon_alpha
	if browser_icon_eyes:
		browser_icon_eyes.modulate.a = clawd_icon_alpha
	if browser_icon_skill:
		browser_icon_skill.modulate.a = clawd_icon_alpha
	if browser_icon_flash:
		browser_icon_flash.modulate.a = (0.20 + absf(sin(Time.get_ticks_msec() * 0.012)) * 0.24) if clawd_icon_alpha >= 0.96 else 0.0

func _remember_body_choice_node(node: CanvasItem) -> void:
	node.visible = false
	body_choice_nodes.append(node)

func _build_parts_tray() -> void:
	_remember_tray_node(_add_texture("scene.right-tray", Vector2(912, 124), Vector2(300, 432), "SetupPartsTray"))
	parts_tray_title_label = _add_label("SPORE KIT", Vector2(948, 158), Vector2(228, 28), 22, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_tray_node(parts_tray_title_label)

	for index in range(SKILL_SLOTS.size()):
		var y := 210 + index * 58
		var slot := _add_texture("scene.tray-slot.empty", Vector2(940, y), Vector2(238, 48), "SkillSlot%s" % index)
		slot.pivot_offset = Vector2(119, 24)
		var light := _add_dot(Vector2(954, y + 17), Color("#3b352d"), "SkillSlotLight%s" % index)
		light.size = Vector2(10, 10)
		light.visible = false
		var label := _add_label("%s    EMPTY" % SKILL_SLOTS[index][0], Vector2(974, y + 12), Vector2(180, 22), 15, Color("#5f4b34"), HORIZONTAL_ALIGNMENT_LEFT)
		slot_rows.append(slot)
		slot_labels.append(label)
		slot_lights.append(light)

	for index in range(STARTERS.size()):
		var x := 916 + index * 56
		var starter: Dictionary = STARTERS[index]
		var plate := _add_texture("scene.menu-slab.default", Vector2(x, 586), Vector2(52, 42), "StarterPlate%s" % index)
		var label := _add_label(str(starter["name"]).substr(0, 4), Vector2(x + 4, 597), Vector2(44, 20), 10, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
		plate.visible = false
		label.visible = false
		starter_plates.append(plate)
		starter_labels.append(label)

func _build_dust() -> void:
	for index in range(14):
		var dust := ColorRect.new()
		dust.name = "WakeDust%s" % index
		dust.color = Color(1.0, 0.82, 0.48, 0.20)
		dust.position = Vector2(360 + (index * 53) % 500, 170 + (index * 37) % 210)
		dust.size = Vector2(2 + index % 3, 2 + index % 2)
		add_child(dust)
		dust_particles.append(dust)

func _remember_tray_node(node: CanvasItem) -> void:
	tray_shell_nodes.append(node)

func _set_tray_shell_visible(visible: bool) -> void:
	for node in tray_shell_nodes:
		node.visible = visible

func _build_bottom_card() -> void:
	_add_texture("scene.bottom-card", Vector2(410, 562), Vector2(460, 112), "SetupIdentityCard")
	selected_label = _add_label("BENCH EMPTY", Vector2(442, 596), Vector2(396, 34), 30, Color("#23170f"), HORIZONTAL_ALIGNMENT_LEFT)

	title_label = _add_label("RITUAL", Vector2(442, 576), Vector2(166, 18), 13, Color("#23170f"), HORIZONTAL_ALIGNMENT_LEFT)
	primary_label = _add_label("NEXT PART", Vector2(642, 576), Vector2(196, 18), 12, Color("#23170f"), HORIZONTAL_ALIGNMENT_RIGHT)
	detail_label = _add_label("bench waiting", Vector2(444, 638), Vector2(394, 18), 11, Color("#4f3927"), HORIZONTAL_ALIGNMENT_LEFT)

	status_pills.append(_add_texture("scene.status-pill", Vector2(28, 668), Vector2(196, 48), "SetupStatusDaemon"))
	status_pills.append(_add_texture("scene.status-pill", Vector2(236, 668), Vector2(196, 48), "SetupStatusModel"))
	status_pills.append(_add_texture("scene.status-pill", Vector2(444, 668), Vector2(196, 48), "SetupStatusBrowser"))
	status_pills.append(_add_texture("scene.status-pill", Vector2(652, 668), Vector2(196, 48), "SetupStatusWorkshop"))
	for spec in [
		[Vector2(64, 692), Vector2(58, 681), "DAEMON READY"],
		[Vector2(272, 692), Vector2(266, 681), "MODEL LOCAL"],
		[Vector2(480, 692), Vector2(474, 681), "BROWSER WAIT"],
		[Vector2(688, 692), Vector2(682, 681), "WORKSHOP LOCK"]
	]:
		var led := _add_dot(spec[0], Color("#47413a"), "SetupStatusLed")
		led.size = Vector2(14, 14)
		status_leds.append(led)
		var label := _add_label(str(spec[2]), spec[1], Vector2(138, 18), 13, Color("#d7c999"), HORIZONTAL_ALIGNMENT_CENTER)
		status_labels.append(label)

	stamp_label = _add_label("SPORE / READY", Vector2(910, 640), Vector2(292, 24), 18, Color("#ffd88a"), HORIZONTAL_ALIGNMENT_CENTER)
	var hint := _add_label("FIT NEXT" if showcase_mode else "ENTER / FIT NEXT", Vector2(914, 670), Vector2(288, 18), 12, Color("#d7c999"), HORIZONTAL_ALIGNMENT_CENTER)
	hint.modulate.a = 0.82

	var track := ColorRect.new()
	track.color = Color("#2a2219")
	track.position = Vector2(410, 548)
	track.size = Vector2(460, 8)
	add_child(track)

	progress_fill = ColorRect.new()
	progress_fill.color = Color("#d7c18a")
	progress_fill.position = Vector2(410, 548)
	progress_fill.size = Vector2(1, 8)
	add_child(progress_fill)

func _update_motion() -> void:
	var bob := sin(Time.get_ticks_msec() * 0.004) * 4.0
	if spore_seed and spore_seed.visible:
		spore_seed.rotation = sin(Time.get_ticks_msec() * 0.003) * 0.05
		spore_seed.position.y = 262.0 + bob
	if bot_body and bot_body.visible:
		var snap := sin(clamp(elapsed / 0.34, 0.0, 1.0) * PI) * 0.055
		var stamp_reaction := 0.0
		if _current_step_id() == "stamp":
			stamp_reaction = sin(clamp(elapsed / 0.46, 0.0, 1.0) * PI) * 0.16
		bot_body.position.y = 224.0 + bob
		bot_body.scale = Vector2(1.0 + snap + stamp_reaction, 1.0 - snap * 0.7 - stamp_reaction * 0.55)
	if eye_panel and eye_panel.visible:
		var blink := _current_step_id() == "eye" and int(Time.get_ticks_msec() * 0.012) % 18 == 0
		eye_panel.scale.y = 0.18 if blink else 1.0
	if bench_glow:
		bench_glow.color = Color(1.0, 0.76, 0.34, 0.07 + abs(sin(Time.get_ticks_msec() * 0.004)) * 0.08)
	if stamp_label:
		stamp_label.modulate.a = 0.72 + abs(sin(Time.get_ticks_msec() * 0.006)) * 0.28
	if save_stamp and save_stamp.visible:
		save_stamp.scale = Vector2.ONE * (1.0 + sin(clamp(elapsed / 0.45, 0.0, 1.0) * PI) * 0.13)
	if skill_ran_label and skill_ran_label.visible:
		skill_ran_label.scale = Vector2.ONE * (1.0 + absf(sin(Time.get_ticks_msec() * 0.010)) * 0.05)
	if save_stamp_plate and save_stamp_plate.visible:
		save_stamp_plate.scale = Vector2.ONE * (1.0 + sin(clamp(elapsed / 0.45, 0.0, 1.0) * PI) * 0.08)
	if step_flash_timer > 0.0:
		var flash := sin((step_flash_timer / 0.38) * PI)
		if bench_glow:
			bench_glow.color = Color(1.0, 0.80, 0.36, 0.11 + flash * 0.13)
	if wake_dim and wake_dim.visible:
		wake_dim.color = Color(0.03, 0.02, 0.015, max(0.0, 0.48 - elapsed * 0.22))
	for index in range(dust_particles.size()):
		var dust := dust_particles[index]
		dust.modulate.a = 0.14 + absf(sin(Time.get_ticks_msec() * 0.0016 + index)) * 0.16
		dust.position.y += sin(Time.get_ticks_msec() * 0.001 + index) * 0.018
	for index in range(attachment_points.size()):
		var point := attachment_points[index]
		point.modulate.a = 0.42 + absf(sin(Time.get_ticks_msec() * 0.006 + index)) * 0.42
	for index in range(skill_parts.size()):
		if skill_parts[index].visible:
			var pop := sin(clamp((elapsed - index * 0.12) / 0.34, 0.0, 1.0) * PI) * 0.12
			var xray_pulse := absf(sin(Time.get_ticks_msec() * 0.014)) * 0.16 if _current_step_id() == "stamp" and index == 0 else 0.0
			skill_parts[index].scale = Vector2.ONE * (1.0 + pop + xray_pulse)
	for index in range(menu_slabs.size()):
		var active := index == step_index
		if active:
			var pulse_scale := 1.0 + absf(sin(Time.get_ticks_msec() * 0.005)) * 0.025
			menu_slabs[index].scale = Vector2(1.035 * pulse_scale, 0.96)
	for index in range(slot_rows.size()):
		if slot_rows[index].visible:
			var state := _slot_state(index)
			var slot_pop := sin(clamp((elapsed - index * 0.06) / 0.28, 0.0, 1.0) * PI) * 0.045
			slot_rows[index].scale = Vector2.ONE * (1.0 + slot_pop if state == "READY" or state == "EQUIPPED" else 1.0)
	_update_browser_hand_motion()

func _update_browser_hand_motion() -> void:
	if not browser_icon_body or not browser_icon_body.visible:
		return

	var step_id := _current_step_id()
	_sync_browser_transfer_visuals()
	var icon_in := browser_icon_body.modulate.a
	var pulse_scale := sin(clamp((elapsed - 0.54) / 0.52, 0.0, 1.0) * PI) * 0.18
	browser_icon_body.scale = Vector2.ONE * (0.72 + icon_in * 0.28 + pulse_scale)
	browser_icon_skill.scale = Vector2.ONE * (0.78 + icon_in * 0.22 + pulse_scale * 0.7)

	if browser_cable:
		var link_pulse: float = absf(sin(Time.get_ticks_msec() * 0.012))
		browser_cable.size = Vector2(196 + link_pulse * 82, 34)
		browser_cable.modulate.a = 0.30 + link_pulse * 0.44
	if browser_ping_label:
		browser_ping_label.modulate.a = 0.72 + absf(sin(Time.get_ticks_msec() * 0.009)) * 0.28

func _save_setup_complete() -> void:
	var file := FileAccess.open("user://superior-setup-complete.flag", FileAccess.WRITE)
	if file:
		file.store_string(Time.get_datetime_string_from_system(true))

func _add_texture(asset_id: String, position: Vector2, size: Vector2, node_name: String) -> TextureRect:
	var texture_rect := TextureRect.new()
	texture_rect.name = node_name
	texture_rect.texture = _factory_texture(asset_id)
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_SCALE
	texture_rect.position = position
	texture_rect.size = size
	add_child(texture_rect)
	return texture_rect

func _add_label(text: String, position: Vector2, size: Vector2, font_size: int, color: Color, align: HorizontalAlignment) -> Label:
	var label := Label.new()
	label.text = text
	label.position = position
	label.size = size
	label.horizontal_alignment = align
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	add_child(label)
	return label

func _add_dot(position: Vector2, color: Color, node_name: String) -> ColorRect:
	var dot := ColorRect.new()
	dot.name = node_name
	dot.color = color
	dot.position = position
	dot.size = Vector2(13, 13)
	add_child(dot)
	return dot

func _add_crt_pass() -> void:
	var overlay := ColorRect.new()
	overlay.name = "OnboardingCRTPixelPass"
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	var shader := load("res://shaders/crt_pixel_pass.gdshader")
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("scanline_strength", 0.07)
	material.set_shader_parameter("dither_strength", 0.03)
	material.set_shader_parameter("low_res_scale", 2.0)
	material.set_shader_parameter("vignette_strength", 0.08)
	overlay.material = material
	add_child(overlay)

func _load_factory_manifest() -> void:
	if not factory_atlas:
		return
	var file := FileAccess.open(FACTORY_ATLAS_MANIFEST_PATH, FileAccess.READ)
	if not file:
		return
	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	for asset in parsed.get("assets", []):
		if typeof(asset) != TYPE_DICTIONARY:
			continue
		var asset_id := str(asset.get("id", ""))
		var rect_data = asset.get("atlasRect", {})
		if asset_id == "" or typeof(rect_data) != TYPE_DICTIONARY:
			continue
		var rect := Rect2i(
			int(rect_data.get("x", 0)),
			int(rect_data.get("y", 0)),
			int(rect_data.get("width", 64)),
			int(rect_data.get("height", 64))
		)
		factory_textures[asset_id] = ImageTexture.create_from_image(factory_image.get_region(rect))

func _load_ownership_manifest() -> void:
	if not ownership_atlas:
		return
	var file := FileAccess.open(OWNERSHIP_ATLAS_MANIFEST_PATH, FileAccess.READ)
	if not file:
		return
	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	for asset in parsed.get("assets", []):
		if typeof(asset) != TYPE_DICTIONARY:
			continue
		var asset_id := str(asset.get("id", ""))
		var rect_data = asset.get("atlasRect", {})
		if asset_id == "" or typeof(rect_data) != TYPE_DICTIONARY:
			continue
		var rect := Rect2i(
			int(rect_data.get("x", 0)),
			int(rect_data.get("y", 0)),
			int(rect_data.get("width", 64)),
			int(rect_data.get("height", 64))
		)
		factory_textures[asset_id] = ImageTexture.create_from_image(ownership_image.get_region(rect))

func _factory_texture(asset_id: String) -> Texture2D:
	return factory_textures.get(asset_id, factory_atlas)

func _load_png_image(path: String) -> Image:
	var image := Image.new()
	var error := image.load(path)
	if error != OK:
		return null
	return image
