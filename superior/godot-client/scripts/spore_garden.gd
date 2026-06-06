extends Node3D
class_name SporeGarden

const BotCatalog := preload("res://scripts/bot_catalog.gd")
const SFX_PLAYER := preload("res://scripts/sfx_player.gd")
const CLAY_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-clay-factory-atlas.json"
const SETUP_STATE_URL := "http://127.0.0.1:5317/setup-state"
const WORKSHOP_SCENE_PATH := "res://scenes/ClayWorkshop.tscn"
const SETUP_POLL_INTERVAL := 3.2

const RACES := [
	{
		"id": "builder",
		"label": "BUILDER RACE",
		"short": "BUILDER",
		"color": Color("#6f8d58"),
		"accent": Color("#d8a849"),
		"line": "project work / tool snap"
	},
	{
		"id": "scout",
		"label": "SCOUT RACE",
		"short": "SCOUT",
		"color": Color("#6fa0b7"),
		"accent": Color("#8fe8ff"),
		"line": "browser signals / lens sweep"
	},
	{
		"id": "sentinel",
		"label": "SENTINEL RACE",
		"short": "SENTINEL",
		"color": Color("#a95442"),
		"accent": Color("#ffe0a3"),
		"line": "checks / shield pulse"
	}
]

var clay_atlas: Texture2D
var clay_image: Image
var clay_textures: Dictionary = {}
var camera: Camera3D
var spore_rig: Node3D
var spore_body: MeshInstance3D
var eye_panel: MeshInstance3D
var eye_orb_left: MeshInstance3D
var eye_orb_right: MeshInstance3D
var eye_lens_core: MeshInstance3D
var race_badge: MeshInstance3D
var lens_part: MeshInstance3D
var badge_part: MeshInstance3D
var side_part: MeshInstance3D
var body_antenna_left: MeshInstance3D
var body_antenna_right: MeshInstance3D
var body_shield: MeshInstance3D
var body_orb_glow: MeshInstance3D
var body_core_bead_left: MeshInstance3D
var body_core_bead_right: MeshInstance3D
var race_markers: Array[MeshInstance3D] = []
var race_labels: Array[Label3D] = []
var garden_props: Dictionary = {}
var click_targets: Array[Area3D] = []
var firefly_nodes: Array[MeshInstance3D] = []
var firefly_bases: Array[Vector3] = []
var status_label: Label
var mood_label: Label
var action_label: Label
var equipped_label: Label
var selected_race_index := 0
var reaction_kind := ""
var reaction_timer := 0.0
var pulse := 0.0
var video_step := 0
var showcase_mode := false
var sfx_player
var setup_request: HTTPRequest
var setup_state: Dictionary = {}
var setup_state_error := ""
var setup_state_loaded := false
var setup_poll_clock := 0.0
var garden_bot: Dictionary = BotCatalog.default_bot_identity()

func _ready() -> void:
	showcase_mode = OS.get_environment("SUPERIOR_SHOWCASE") == "1"
	clay_image = _load_png_image("res://assets/clay/superior-clay-factory-atlas.png")
	if clay_image:
		clay_atlas = ImageTexture.create_from_image(clay_image)
	_load_clay_asset_manifest()
	_build_garden()
	_build_hud()
	_build_sfx()
	_build_runtime_probe()
	_apply_bot_identity(garden_bot)
	_request_setup_state()

func _process(delta: float) -> void:
	pulse += delta
	if reaction_timer > 0.0:
		reaction_timer = max(0.0, reaction_timer - delta)
		if reaction_timer == 0.0:
			_refresh_identity_copy()
	_tick_setup_poll(delta)
	_update_motion()
	_update_video_proof()

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_handle_scene_click(event.position)
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_1:
			_trigger_reaction("play")
		if event.keycode == KEY_2:
			_show_loadout_reaction()
		if event.keycode == KEY_3:
			_trigger_reaction("signal")
		if event.keycode == KEY_Q:
			_select_race(max(0, selected_race_index - 1))
		if event.keycode == KEY_E:
			_select_race(min(RACES.size() - 1, selected_race_index + 1))
		if event.keycode == KEY_ENTER or event.keycode == KEY_SPACE:
			get_tree().change_scene_to_file(WORKSHOP_SCENE_PATH)

func _build_runtime_probe() -> void:
	setup_request = HTTPRequest.new()
	setup_request.name = "GardenSetupProbe"
	add_child(setup_request)
	setup_request.request_completed.connect(_on_setup_state_response)

func _request_setup_state() -> void:
	if not setup_request or setup_request.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
		return
	var error := setup_request.request(SETUP_STATE_URL)
	if error != OK:
		setup_state_loaded = true
		setup_state_error = "daemon offline"
		_refresh_identity_copy()

func _tick_setup_poll(delta: float) -> void:
	setup_poll_clock += delta
	if setup_poll_clock < SETUP_POLL_INTERVAL:
		return
	setup_poll_clock = 0.0
	_request_setup_state()

func _on_setup_state_response(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	setup_state_loaded = true
	if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
		setup_state_error = "daemon offline"
		_refresh_identity_copy()
		return
	var parsed := _parse_json_dictionary(body)
	if parsed.is_empty():
		setup_state_error = "bad response"
		_refresh_identity_copy()
		return
	setup_state = parsed
	setup_state_error = ""
	var bot_state = parsed.get("bot", {})
	if typeof(bot_state) == TYPE_DICTIONARY:
		_apply_bot_identity(bot_state.get("identity", {}))
	else:
		_refresh_identity_copy()

func _build_garden() -> void:
	camera = Camera3D.new()
	camera.position = Vector3(0.0, 3.16, 6.65)
	camera.rotation_degrees = Vector3(-20.0, 0.0, 0.0)
	camera.fov = 58.0
	add_child(camera)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-44, 18, 0)
	sun.light_energy = 0.65
	add_child(sun)

	var lamp := OmniLight3D.new()
	lamp.position = Vector3(-0.3, 3.2, -1.35)
	lamp.light_color = Color("#ffc36b")
	lamp.light_energy = 2.2
	add_child(lamp)

	_add_panel("GardenWall", "scene.wall", Vector2(12.8, 5.2), Vector3(0, 1.82, -2.5))
	_add_panel("GardenTable", "scene.table", Vector2(13.8, 1.28), Vector3(0, -1.04, 0.04))
	garden_props["island"] = _add_sphere(self, "GardenClayIsland", 1.0, Vector3(0.0, -0.42, 0.52), Color("#7a5a3a"))
	garden_props["island"].scale = Vector3(3.35, 0.42, 1.58)
	_add_box(self, "GardenSoil", Vector3(4.9, 0.18, 2.22), Vector3(0.0, -0.12, 0.58), Color("#69452f"))
	garden_props["pond"] = _add_sphere(self, "GardenPond", 0.48, Vector3(-1.55, 0.02, 0.72), Color("#4d8f8c"))
	garden_props["pond"].scale = Vector3(1.34, 0.12, 0.72)
	_add_box(self, "PondBridgeA", Vector3(1.25, 0.08, 0.13), Vector3(-1.55, 0.16, 0.72), Color("#c39a66"))
	_add_box(self, "PondBridgeB", Vector3(0.12, 0.1, 0.62), Vector3(-1.98, 0.18, 0.72), Color("#8f5a3d"))
	_add_box(self, "PondBridgeC", Vector3(0.12, 0.1, 0.62), Vector3(-1.12, 0.18, 0.72), Color("#8f5a3d"))
	_add_panel("GardenLamp", "scene.lamp", Vector2(1.5, 1.08), Vector3(-0.08, 2.95, -1.54))
	_add_panel("GardenSign", "scene.menu-slab.default", Vector2(3.25, 0.58), Vector3(0.0, 2.36, -1.45))
	_add_world_label("SPORE GARDEN", Vector3(-0.74, 2.34, -0.94), 28, Color("#23170f"))
	_add_world_label("CLAY ISLAND", Vector3(-0.31, 2.14, -0.94), 14, Color("#4c3524"))

	_build_race_stones()
	_build_spore()
	_build_garden_props()
	_build_ambient_life()
	_build_gate()

func _build_race_stones() -> void:
	for index in range(RACES.size()):
		var race: Dictionary = RACES[index]
		var x := -1.12 + float(index) * 1.12
		var stone := _add_box(self, "RaceStone%s" % index, Vector3(0.72, 0.16, 0.44), Vector3(x, 0.02, -0.1), Color("#c5a879"))
		race_markers.append(stone)
		_add_sphere(self, "RaceHead%s" % index, 0.19, Vector3(x, 0.28, -0.1), race["color"])
		if index == 1:
			_add_sphere(self, "RaceLens%s" % index, 0.08, Vector3(x, 0.32, 0.08), Color("#8fe8ff"))
		if index == 2:
			_add_box(self, "RaceShield%s" % index, Vector3(0.2, 0.14, 0.08), Vector3(x + 0.14, 0.3, 0.08), Color("#ffe0a3"))
		var label := _add_world_label(str(race["short"]), Vector3(x - 0.28, -0.04, 0.18), 12, Color("#23170f"))
		race_labels.append(label)
		_add_click_area("ClickRaceStone%s" % index, Vector3(x, 0.18, -0.1), Vector3(0.8, 0.72, 0.7), "race:%s" % index)

func _build_spore() -> void:
	spore_rig = Node3D.new()
	spore_rig.name = "GardenSpore"
	spore_rig.position = Vector3(0.0, 0.47, 0.82)
	add_child(spore_rig)

	spore_body = _add_panel_to(spore_rig, "GardenSporeBody", "bot.clawd.body", Vector2(1.52, 1.52), Vector3(0.0, 0.42, 0.14))
	eye_panel = _add_panel_to(spore_rig, "GardenSporeEyes", "bot.clawd.eye.pixel", Vector2(0.72, 0.36), Vector3(0.0, 0.55, 0.35))
	eye_orb_left = _add_sphere(spore_rig, "GardenEyeOrbLeft", 0.062, Vector3(-0.17, 0.55, 0.38), Color("#dff8ff"))
	eye_orb_right = _add_sphere(spore_rig, "GardenEyeOrbRight", 0.062, Vector3(0.17, 0.55, 0.38), Color("#dff8ff"))
	eye_lens_core = _add_sphere(spore_rig, "GardenEyeLensCore", 0.14, Vector3(0.0, 0.55, 0.39), Color("#dff8ff"))
	race_badge = _add_box(spore_rig, "GardenRaceBadge", Vector3(0.24, 0.18, 0.08), Vector3(0.58, 0.55, 0.41), Color("#d8a849"))
	lens_part = _add_panel_to(spore_rig, "GardenSkillLens", "bot.clawd.skill.eye", Vector2(0.34, 0.34), Vector3(-0.58, 0.54, 0.42))
	badge_part = _add_panel_to(spore_rig, "GardenSkillBadge", "bot.clawd.skill.badge", Vector2(0.32, 0.32), Vector3(0.68, 0.54, 0.42))
	side_part = _add_panel_to(spore_rig, "GardenSkillSide", "bot.clawd.skill.side", Vector2(0.34, 0.34), Vector3(-0.76, 0.25, 0.3))
	body_antenna_left = _add_box(spore_rig, "GardenAntennaLeft", Vector3(0.06, 0.4, 0.06), Vector3(-0.25, 1.0, 0.18), Color("#42502f"))
	body_antenna_right = _add_box(spore_rig, "GardenAntennaRight", Vector3(0.06, 0.3, 0.06), Vector3(0.22, 0.95, 0.18), Color("#42502f"))
	body_shield = _add_box(spore_rig, "GardenBodyShield", Vector3(0.24, 0.18, 0.08), Vector3(0.54, 0.72, 0.38), Color("#ffe0a3"))
	body_orb_glow = _add_sphere(spore_rig, "GardenBodyOrbGlow", 0.1, Vector3(0.0, 0.42, 0.25), Color("#ffd88a"))
	body_core_bead_left = _add_sphere(spore_rig, "GardenCoreBeadLeft", 0.06, Vector3(-0.14, 0.88, 0.22), Color("#d7c999"))
	body_core_bead_right = _add_sphere(spore_rig, "GardenCoreBeadRight", 0.06, Vector3(0.14, 0.88, 0.22), Color("#d7c999"))

func _build_garden_props() -> void:
	for index in range(6):
		var x := -2.64 + float(index) * 0.54
		var z := 0.16 + sin(float(index)) * 0.26
		_add_sphere(self, "ClayPebble%s" % index, 0.065 + float(index % 3) * 0.015, Vector3(x, 0.02, z + 0.78), Color("#8b6a4a"))
	garden_props["toy_ball"] = _add_sphere(self, "GardenToyBall", 0.24, Vector3(-0.92, 0.11, 1.35), Color("#d8a849"))
	garden_props["fruit"] = _add_sphere(self, "GardenFruit", 0.18, Vector3(1.12, 0.18, 1.18), Color("#a95442"))
	garden_props["fruit_leaf"] = _add_box(self, "GardenFruitLeaf", Vector3(0.08, 0.18, 0.08), Vector3(1.2, 0.34, 1.16), Color("#456d43"))
	garden_props["plant_pot"] = _add_sphere(self, "GardenPlantPot", 0.22, Vector3(-2.52, -0.02, 0.72), Color("#6f7b58"))
	_add_box(self, "GardenLeafA", Vector3(0.08, 0.52, 0.08), Vector3(-2.58, 0.36, 0.72), Color("#456d43"))
	_add_box(self, "GardenLeafB", Vector3(0.08, 0.42, 0.08), Vector3(-2.42, 0.3, 0.73), Color("#4f7a48"))
	garden_props["pinwheel"] = _add_box(self, "SignalPinwheel", Vector3(0.12, 0.62, 0.12), Vector3(2.06, 0.32, 0.42), Color("#8fe8ff"))
	_add_box(self, "SignalPinwheelStem", Vector3(0.05, 0.6, 0.05), Vector3(2.06, 0.06, 0.42), Color("#4f6848"))
	_add_world_label("PLAY", Vector3(-1.12, 0.44, 1.54), 13, Color("#f8e6b2"))
	_add_world_label("FEED", Vector3(0.94, 0.48, 1.4), 13, Color("#f8e6b2"))
	_add_world_label("SIGNAL", Vector3(1.72, 0.7, 0.68), 13, Color("#f8e6b2"))
	_add_click_area("ClickToyBall", Vector3(-0.92, 0.18, 1.35), Vector3(0.72, 0.72, 0.72), "play")
	_add_click_area("ClickFruit", Vector3(1.12, 0.2, 1.18), Vector3(0.64, 0.64, 0.64), "feed")
	_add_click_area("ClickSignalPond", Vector3(1.98, 0.3, 0.46), Vector3(0.72, 0.85, 0.72), "signal")

func _build_ambient_life() -> void:
	var bases := [
		Vector3(-2.2, 1.36, 0.18),
		Vector3(-1.18, 1.62, 1.36),
		Vector3(-0.18, 1.82, -0.12),
		Vector3(1.02, 1.46, 1.52),
		Vector3(2.02, 1.18, 0.32)
	]
	for index in range(bases.size()):
		var mote := _add_sphere(self, "GardenFirefly%s" % index, 0.05, bases[index], Color("#ffe7a2"))
		firefly_nodes.append(mote)
		firefly_bases.append(bases[index])

func _build_gate() -> void:
	_add_panel("WorkshopGatePlate", "scene.status-pill", Vector2(1.5, 0.42), Vector3(2.45, 0.42, 0.36))
	_add_world_label("ENTER WORKSHOP", Vector3(2.12, 0.41, 0.62), 14, Color("#d7c999"))
	_add_click_area("ClickWorkshopGate", Vector3(2.45, 0.42, 0.36), Vector3(1.65, 0.58, 0.55), "gate")

func _build_hud() -> void:
	var hud := CanvasLayer.new()
	add_child(hud)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.add_child(root)

	status_label = _add_hud_label(root, "CLAWD", Vector2(26, 20), Vector2(320, 30), 20, Color("#f8e6b2"))
	mood_label = _add_hud_label(root, "ORB / LAVENDER / GLOW", Vector2(26, 54), Vector2(420, 26), 16, Color("#d7c999"))
	equipped_label = _add_hud_label(root, "KIT / X-RAY / REPO / EXPLAIN", Vector2(26, 88), Vector2(520, 26), 16, Color("#d7c999"))
	action_label = _add_hud_label(root, "PLAY   FEED   SIGNAL   ENTER", Vector2(728, 646), Vector2(452, 26), 14, Color("#f8e6b2"))
	_add_crt_pass(root)

func _build_sfx() -> void:
	sfx_player = SFX_PLAYER.new()
	add_child(sfx_player)

func _apply_bot_identity(raw_bot: Dictionary) -> void:
	garden_bot = BotCatalog.normalize_bot_identity(raw_bot)
	_set_selected_race(_race_index_for_id(str(garden_bot.get("race", "builder"))))
	_apply_bot_visuals()
	_refresh_identity_copy()

func _refresh_identity_copy() -> void:
	if status_label:
		var title := str(garden_bot.get("name", "Clawd")).to_upper()
		if setup_state_error != "" and setup_state_loaded:
			title += " / LOCAL"
		status_label.text = title
	if mood_label:
		mood_label.text = BotCatalog.format_identity_meta(garden_bot)
	if equipped_label:
		equipped_label.text = "KIT / %s" % BotCatalog.format_loadout_meta(garden_bot)
	if action_label:
		action_label.text = "PLAY   FEED   SIGNAL   ENTER"

func _set_selected_race(index: int) -> void:
	selected_race_index = clamp(index, 0, RACES.size() - 1)
	for marker_index in range(race_markers.size()):
		var marker := race_markers[marker_index]
		var label := race_labels[marker_index]
		var active := marker_index == selected_race_index
		marker.scale = Vector3(1.14, 1.14, 1.14) if active else Vector3.ONE
		if marker.material_override:
			marker.material_override.albedo_color = Color("#e0be72") if active else Color("#c5a879")
		if label:
			label.modulate = Color("#f8e6b2") if active else Color("#23170f")

func _select_race(index: int) -> void:
	_set_selected_race(index)
	_trigger_reaction("race")

func _show_loadout_reaction() -> void:
	_trigger_reaction("equip")
	if equipped_label:
		equipped_label.text = "KIT / %s" % BotCatalog.format_loadout_meta(garden_bot)

func _trigger_reaction(kind: String) -> void:
	reaction_kind = kind
	reaction_timer = 0.72
	if sfx_player:
		match kind:
			"play":
				sfx_player.play_sfx("play", 0.82)
			"feed":
				sfx_player.play_sfx("equip", 0.72)
			"equip":
				sfx_player.play_sfx("equip", 0.9)
			"signal":
				sfx_player.play_sfx("signal", 0.86)
			"race":
				sfx_player.play_sfx("select", 0.56)
	if mood_label:
		match kind:
			"play":
				mood_label.text = "%s / HAPPY HOP" % str(garden_bot.get("name", "Clawd")).to_upper()
			"feed":
				mood_label.text = "%s / FED" % str(garden_bot.get("name", "Clawd")).to_upper()
			"equip":
				mood_label.text = "%s / KIT SNAP" % str(garden_bot.get("name", "Clawd")).to_upper()
			"signal":
				mood_label.text = "%s / SIGNAL CAUGHT" % str(garden_bot.get("name", "Clawd")).to_upper()
			"race":
				var race: Dictionary = RACES[selected_race_index]
				mood_label.text = "%s / %s" % [str(race["short"]), str(race["line"]).to_upper()]

func _apply_bot_visuals() -> void:
	var pigment := BotCatalog.pigment_info(str(garden_bot.get("color", "lavender")))
	var body_id := str(garden_bot.get("body", "orb"))
	var eye_id := str(garden_bot.get("eye", "glow"))
	if spore_body and spore_body.material_override:
		spore_body.material_override.albedo_color = pigment.get("color", Color.WHITE)
	var race: Dictionary = RACES[_race_index_for_id(str(garden_bot.get("race", "builder")))]
	if race_badge and race_badge.material_override:
		race_badge.material_override.albedo_color = race.get("accent", Color("#d8a849"))
	_apply_body_style(body_id, pigment)
	_apply_eye_style(eye_id)
	_apply_skill_style(pigment)

func _apply_body_style(body_id: String, pigment: Dictionary) -> void:
	var shadow = pigment.get("shadow", Color("#4e463f"))
	var highlight = pigment.get("highlight", Color("#fff8ec"))
	spore_body.position = Vector3(0.0, 0.42, 0.14)
	match body_id:
		"scanner":
			spore_body.scale = Vector3(0.92, 0.86, 1.0)
		"sentinel":
			spore_body.scale = Vector3(1.0, 0.94, 1.0)
		"core":
			spore_body.scale = Vector3(0.86, 0.86, 1.0)
		"gremlin":
			spore_body.scale = Vector3(1.0, 1.0, 1.0)
		_:
			spore_body.scale = Vector3(1.06, 1.06, 1.0)
	if body_antenna_left and body_antenna_left.material_override:
		body_antenna_left.visible = body_id == "gremlin"
		body_antenna_left.material_override.albedo_color = shadow
	if body_antenna_right and body_antenna_right.material_override:
		body_antenna_right.visible = body_id == "gremlin"
		body_antenna_right.material_override.albedo_color = shadow
	if body_shield and body_shield.material_override:
		body_shield.visible = body_id == "sentinel"
		body_shield.material_override.albedo_color = highlight
	if body_orb_glow and body_orb_glow.material_override:
		body_orb_glow.visible = body_id == "orb"
		body_orb_glow.material_override.albedo_color = highlight
	if body_core_bead_left and body_core_bead_left.material_override:
		body_core_bead_left.visible = body_id == "core"
		body_core_bead_left.material_override.albedo_color = highlight
	if body_core_bead_right and body_core_bead_right.material_override:
		body_core_bead_right.visible = body_id == "core"
		body_core_bead_right.material_override.albedo_color = highlight

func _apply_eye_style(eye_id: String) -> void:
	var eye_color := Color("#dff8ff") if eye_id == "lens" or eye_id == "glow" else Color("#15120f")
	if eye_panel and eye_panel.material_override:
		eye_panel.visible = eye_id == "pixel"
		eye_panel.material_override.albedo_color = Color.WHITE
	if eye_orb_left and eye_orb_left.material_override:
		eye_orb_left.visible = eye_id == "dot" or eye_id == "glow"
		eye_orb_left.material_override.albedo_color = eye_color
		eye_orb_left.scale = Vector3.ONE * (1.12 if eye_id == "glow" else 0.72)
	if eye_orb_right and eye_orb_right.material_override:
		eye_orb_right.visible = eye_id == "dot" or eye_id == "glow"
		eye_orb_right.material_override.albedo_color = eye_color
		eye_orb_right.scale = Vector3.ONE * (1.12 if eye_id == "glow" else 0.72)
	if eye_lens_core and eye_lens_core.material_override:
		eye_lens_core.visible = eye_id == "lens"
		eye_lens_core.material_override.albedo_color = eye_color

func _apply_skill_style(pigment: Dictionary) -> void:
	var highlight = pigment.get("highlight", Color("#f0cd7a"))
	var shadow = pigment.get("shadow", Color("#4e463f"))
	var eye_skill := BotCatalog.equipped_skill_for_slot(garden_bot, "eye")
	var side_skill := BotCatalog.equipped_skill_for_slot(garden_bot, "side")
	var badge_skill := BotCatalog.equipped_skill_for_slot(garden_bot, "badge")
	if lens_part and lens_part.material_override:
		lens_part.visible = eye_skill != ""
		lens_part.material_override.albedo_color = highlight
	if side_part and side_part.material_override:
		side_part.visible = side_skill != ""
		side_part.material_override.albedo_color = shadow
	if badge_part and badge_part.material_override:
		badge_part.visible = badge_skill != ""
		badge_part.material_override.albedo_color = Color("#f0cd7a")

func _update_motion() -> void:
	if not spore_rig:
		return
	var reaction := reaction_timer / 0.72
	var hop := 0.0
	var snap := 0.0
	if reaction_kind == "play":
		hop = sin(reaction * PI) * 0.42
	if reaction_kind == "feed":
		hop = sin(reaction * PI) * 0.28
	if reaction_kind == "equip":
		snap = sin(reaction * PI) * 0.14
	if reaction_kind == "signal":
		snap = sin(reaction * PI * 2.0) * 0.09
	var wander_x := sin(pulse * 0.42) * 0.28
	var wander_z := cos(pulse * 0.31) * 0.12
	if reaction_kind == "play" and reaction_timer > 0.0:
		wander_x -= sin(reaction * PI) * 0.36
	if reaction_kind == "feed" and reaction_timer > 0.0:
		wander_x += sin(reaction * PI) * 0.34
	spore_rig.position.x = wander_x
	spore_rig.position.y = 0.47 + sin(pulse * 1.35) * 0.025 + hop
	spore_rig.position.z = 0.82 + wander_z
	spore_rig.rotation.y = sin(pulse * 0.7) * 0.08 + (sin(reaction * PI) * 0.15 if reaction_kind == "signal" else 0.0)
	spore_rig.scale = Vector3(1.0 + snap, 1.0 - snap * 0.8, 1.0)
	if camera:
		camera.position.x = sin(pulse * 0.2) * 0.14
		camera.position.y = 3.16 + cos(pulse * 0.24) * 0.04
		camera.rotation_degrees.x = -20.0 + sin(pulse * 0.18) * 0.8
	if eye_panel and eye_panel.visible:
		var blink := int(pulse * 2.0) % 7 == 0 or (reaction_kind == "play" and reaction_timer > 0.28)
		eye_panel.scale.y = 0.25 if blink else 1.0
	if eye_lens_core and eye_lens_core.visible:
		eye_lens_core.scale = Vector3.ONE * (1.0 + sin(pulse * 2.2) * 0.04)
	if lens_part:
		lens_part.scale = Vector3.ONE * (1.0 + (sin(reaction_timer * 13.0) * 0.12 if reaction_kind == "equip" or reaction_kind == "signal" else 0.0))
	if badge_part:
		badge_part.scale = Vector3.ONE * (1.0 + (sin(reaction_timer * 11.0) * 0.1 if reaction_kind == "feed" else 0.0))
	if side_part:
		side_part.scale = Vector3.ONE * (1.0 + (sin(reaction_timer * 9.0) * 0.1 if reaction_kind == "race" else 0.0))
	_update_prop_motion()

func _update_prop_motion() -> void:
	var press := sin((reaction_timer / 0.72) * PI)
	if garden_props.has("toy_ball"):
		var ball: MeshInstance3D = garden_props["toy_ball"]
		ball.rotation.z = pulse * 1.5 + (press * 2.0 if reaction_kind == "play" else 0.0)
		ball.position.x = -0.92 - (press * 0.22 if reaction_kind == "play" else 0.0)
	if garden_props.has("fruit"):
		var fruit: MeshInstance3D = garden_props["fruit"]
		fruit.position.y = 0.18 + sin(pulse * 2.0) * 0.025 + (press * 0.12 if reaction_kind == "feed" else 0.0)
	if garden_props.has("pond") and garden_props["pond"].material_override:
		var pond: MeshInstance3D = garden_props["pond"]
		pond.material_override.albedo_color = Color("#8fe8ff") if reaction_kind == "signal" and reaction_timer > 0.0 else Color("#4d8f8c")
	if garden_props.has("pinwheel"):
		var pinwheel: MeshInstance3D = garden_props["pinwheel"]
		pinwheel.rotation.z = pulse * 0.8 + (press * 5.0 if reaction_kind == "signal" else 0.0)
	for index in range(firefly_nodes.size()):
		var mote := firefly_nodes[index]
		var base := firefly_bases[index]
		mote.position.x = base.x + sin(pulse * (0.72 + float(index) * 0.12)) * 0.22
		mote.position.y = base.y + cos(pulse * (1.15 + float(index) * 0.1)) * 0.12
		mote.position.z = base.z + sin(pulse * (0.56 + float(index) * 0.08)) * 0.18
		mote.scale = Vector3.ONE * (0.85 + absf(sin(pulse * 2.2 + float(index))) * 0.45)
		if mote.material_override:
			mote.material_override.albedo_color = Color("#fff3b6").lerp(Color("#8fe8ff"), absf(sin(pulse * 1.4 + float(index) * 0.8)) * 0.35)

func _update_video_proof() -> void:
	if OS.get_environment("SUPERIOR_VIDEO_PROOF") != "1":
		return
	var beat_1 := 0.72 if showcase_mode else 0.8
	var beat_2 := 1.85 if showcase_mode else 2.05
	var beat_3 := 3.0 if showcase_mode else 3.4
	var beat_4 := 4.18 if showcase_mode else 4.8
	var beat_5 := 5.4 if showcase_mode else 6.0
	var beat_6 := 6.9 if showcase_mode else 7.4
	if video_step == 0 and pulse > beat_1:
		video_step = 1
		_set_selected_race(_race_index_for_id(str(garden_bot.get("race", "builder"))))
		_trigger_reaction("race")
	if video_step == 1 and pulse > beat_2:
		video_step = 2
		_trigger_reaction("play")
	if video_step == 2 and pulse > beat_3:
		video_step = 3
		_show_loadout_reaction()
	if video_step == 3 and pulse > beat_4:
		video_step = 4
		_trigger_reaction("feed")
	if video_step == 4 and pulse > beat_5:
		video_step = 5
		_trigger_reaction("signal")
	if video_step == 5 and pulse > beat_6:
		video_step = 6
		get_tree().change_scene_to_file(WORKSHOP_SCENE_PATH)

func _handle_scene_click(screen_position: Vector2) -> void:
	if not camera:
		return
	var ray_origin := camera.project_ray_origin(screen_position)
	var ray_end := ray_origin + camera.project_ray_normal(screen_position) * 100.0
	var query := PhysicsRayQueryParameters3D.create(ray_origin, ray_end)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if not hit.has("collider"):
		return
	var collider = hit["collider"]
	if not collider or not collider.has_meta("kind"):
		return
	var kind := str(collider.get_meta("kind"))
	if kind == "gate":
		get_tree().change_scene_to_file(WORKSHOP_SCENE_PATH)
	elif kind.begins_with("race:"):
		var race_index := int(kind.split(":")[1])
		_select_race(race_index)
	elif kind == "play" or kind == "feed" or kind == "signal":
		_trigger_reaction(kind)

func _race_index_for_id(race_id: String) -> int:
	for index in range(RACES.size()):
		if str(RACES[index]["id"]) == race_id:
			return index
	return 0

func _parse_json_dictionary(body: PackedByteArray) -> Dictionary:
	var parsed = JSON.parse_string(body.get_string_from_utf8())
	if typeof(parsed) != TYPE_DICTIONARY:
		return {}
	return parsed

func _load_clay_asset_manifest() -> void:
	if not clay_image:
		return
	var file := FileAccess.open(CLAY_ATLAS_MANIFEST_PATH, FileAccess.READ)
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
		clay_textures[asset_id] = ImageTexture.create_from_image(clay_image.get_region(rect))

func _add_panel(name: String, asset_id: String, size: Vector2, position: Vector3) -> MeshInstance3D:
	return _add_panel_to(self, name, asset_id, size, position)

func _add_panel_to(parent: Node, name: String, asset_id: String, size: Vector2, position: Vector3) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	var mesh := QuadMesh.new()
	mesh.size = size
	instance.name = name
	instance.mesh = mesh
	instance.position = position
	instance.material_override = _texture_material(asset_id)
	parent.add_child(instance)
	return instance

func _add_box(parent: Node, name: String, size: Vector3, position: Vector3, color: Color, asset_id: String = "") -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	instance.name = name
	instance.mesh = mesh
	instance.position = position
	instance.material_override = _material(color, asset_id)
	parent.add_child(instance)
	return instance

func _add_sphere(parent: Node, name: String, radius: float, position: Vector3, color: Color, asset_id: String = "") -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 12
	mesh.rings = 6
	instance.name = name
	instance.mesh = mesh
	instance.position = position
	instance.material_override = _material(color, asset_id)
	parent.add_child(instance)
	return instance

func _add_click_area(name: String, position: Vector3, size: Vector3, kind: String) -> Area3D:
	var area := Area3D.new()
	area.name = name
	area.position = position
	area.input_ray_pickable = true
	area.set_meta("kind", kind)
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	shape.shape = box
	area.add_child(shape)
	add_child(area)
	click_targets.append(area)
	return area

func _add_world_label(text: String, position: Vector3, size: int, color: Color) -> Label3D:
	var label := Label3D.new()
	label.text = text
	label.position = position
	label.font_size = size
	label.modulate = color
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	add_child(label)
	return label

func _add_hud_label(parent: Control, text: String, position: Vector2, size: Vector2, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.position = position
	label.size = size
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	parent.add_child(label)
	return label

func _add_crt_pass(root: Control) -> void:
	var overlay := ColorRect.new()
	overlay.name = "SporeGardenCRTPixelPass"
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	var shader := load("res://shaders/crt_pixel_pass.gdshader")
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("scanline_strength", 0.05)
	material.set_shader_parameter("dither_strength", 0.018)
	material.set_shader_parameter("low_res_scale", 2.0)
	material.set_shader_parameter("vignette_strength", 0.05)
	overlay.material = material
	root.add_child(overlay)

func _texture_material(asset_id: String) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color.WHITE
	if clay_textures.has(asset_id):
		material.albedo_texture = clay_textures[asset_id]
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	material.roughness = 0.92
	return material

func _material(color: Color, asset_id: String = "") -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	if asset_id != "" and clay_textures.has(asset_id):
		material.albedo_texture = clay_textures[asset_id]
		material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	material.roughness = 0.92
	return material

func _load_png_image(path: String) -> Image:
	var image := Image.new()
	var error := image.load(path)
	if error != OK:
		return null
	return image
