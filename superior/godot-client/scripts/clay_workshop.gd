extends Node3D
class_name ClayWorkshop

const BotCatalog := preload("res://scripts/bot_catalog.gd")
const SFX_PLAYER := preload("res://scripts/sfx_player.gd")
const CLAY_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-clay-factory-atlas.json"
const GARDEN_SCENE_PATH := "res://scenes/SporeGarden.tscn"
const SETUP_STATE_URL := "http://127.0.0.1:5317/setup-state"
const CREATION_OPTIONS_URL := "http://127.0.0.1:5317/bot-creation-options"
const BOT_IDENTITY_URL := "http://127.0.0.1:5317/bot-identity"
const SETUP_POLL_INTERVAL := 2.4
const WORKSHOP_MENU_IDS := ["home", "build", "loadout", "browser"]
const WORKSHOP_MENU_LABELS := ["HOME", "BUILD", "LOADOUT", "BROWSER"]
const STATUS_PILL_IDS := ["power", "key", "hand"]
const STATUS_PILL_LABELS := ["POWER", "KEY", "HAND"]

var realtime_client := preload("res://scripts/realtime_client.gd").new()

var clay_atlas: Texture2D
var clay_image: Image
var terminal: RichTextLabel
var status_label: Label
var stats_label: Label
var signal_label: Label
var camera: Camera3D
var bot_rig: Node3D
var bot_body: MeshInstance3D
var eye_panel: MeshInstance3D
var eye_orb_left: MeshInstance3D
var eye_orb_right: MeshInstance3D
var eye_lens_core: MeshInstance3D
var badge_part: MeshInstance3D
var side_part: MeshInstance3D
var lens_part: MeshInstance3D
var crown_part: MeshInstance3D
var charm_part: MeshInstance3D
var body_antenna_left: MeshInstance3D
var body_antenna_right: MeshInstance3D
var body_shield: MeshInstance3D
var body_orb_glow: MeshInstance3D
var body_core_bead_left: MeshInstance3D
var body_core_bead_right: MeshInstance3D
var lamp_light: OmniLight3D
var tray_light: OmniLight3D
var workshop_menu_slabs: Array[MeshInstance3D] = []
var workshop_menu_lights: Array[MeshInstance3D] = []
var workshop_tray_slots: Array[MeshInstance3D] = []
var workshop_tray_lights: Array[MeshInstance3D] = []
var tray_row_key_labels: Array[Label3D] = []
var tray_row_value_labels: Array[Label3D] = []
var tray_title_label: Label3D
var monitor_panel: MeshInstance3D
var monitor_label: Label3D
var monitor_text_target := ""
var monitor_text_current := ""
var monitor_typing_clock := 0.0

var battery_node: MeshInstance3D
var spool_node: MeshInstance3D
var switch_node: MeshInstance3D

var status_pill_panels: Array[MeshInstance3D] = []
var status_pill_title_labels: Array[Label3D] = []
var status_pill_state_labels: Array[Label3D] = []
var identity_title_label: Label3D
var identity_name_label: Label3D
var identity_meta_label: Label3D
var identity_skill_label: Label3D
var identity_note_label: Label3D
var trace_nodes: Array[MeshInstance3D] = []
var prop_nodes: Dictionary = {}
var click_targets: Array[Area3D] = []
var clay_textures: Dictionary = {}
var reaction_kind := ""
var reaction_timer := 0.0
var pulse := 0.0
var latest_intensity := 1
var video_reaction_step := 0
var showcase_mode := false
var sfx_player
var menu_focus_index := 1
var tray_focus_index := 0
var signal_message_timer := 0.0
var setup_request: HTTPRequest
var options_request: HTTPRequest
var bot_save_request: HTTPRequest
var realtime_status := "connecting"
var setup_state: Dictionary = {}
var creation_options: Dictionary = {}
var persisted_bot: Dictionary = BotCatalog.default_bot_identity()
var workshop_bot: Dictionary = BotCatalog.default_bot_identity()
var setup_state_loaded := false
var setup_state_error := ""
var setup_poll_clock := 0.0
var bot_save_pending := false
var bot_save_dirty := false
var bot_unsaved_local := false
var build_body_index := 0
var build_color_index := 0
var build_eye_index := 0
var tray_row_models: Array[Dictionary] = []

func _ready() -> void:
	showcase_mode = OS.get_environment("SUPERIOR_SHOWCASE") == "1"
	clay_image = _load_png_image("res://assets/clay/superior-clay-factory-atlas.png")
	if clay_image:
		clay_atlas = ImageTexture.create_from_image(clay_image)
	_load_clay_asset_manifest()
	_build_room()
	_build_hud()
	_build_sfx()
	_build_runtime_probes()
	add_child(realtime_client)
	realtime_client.message_received.connect(_on_realtime_message)
	realtime_client.server_status_changed.connect(_on_server_status_changed)
	realtime_client.connect_to_server("ws://127.0.0.1:7357/socket")
	_add_terminal_line("WORKSHOP / BENCH READY")
	_request_creation_options()
	_request_setup_state()
	_sync_selection_indices_from_bot()
	_refresh_all_ui()
	_sync_signal_prompt()
	sfx_player.play_sfx("success", 0.45)

func _process(delta: float) -> void:
	pulse += delta
	if signal_message_timer > 0.0:
		signal_message_timer = max(0.0, signal_message_timer - delta)
		if signal_message_timer == 0.0:
			_sync_signal_prompt()
	if reaction_timer > 0.0:
		reaction_timer = max(0.0, reaction_timer - delta)
	
	# Monitor typing effect
	if monitor_label and monitor_text_current != monitor_text_target:
		monitor_typing_clock += delta
		if monitor_typing_clock > 0.04:
			monitor_typing_clock = 0.0
			monitor_text_current = monitor_text_target.left(monitor_text_current.length() + 1)
			monitor_label.text = monitor_text_current
			if sfx_player and int(pulse * 100) % 2 == 0:
				sfx_player.play_sfx("step", 0.08)

	_tick_setup_poll(delta)
	_update_video_proof_reactions()
	_update_bot_motion()
	_update_lights()
	_update_stats()

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_handle_scene_click(event.position)
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_UP or event.keycode == KEY_W:
			_step_menu_focus(-1)
		if event.keycode == KEY_DOWN or event.keycode == KEY_S:
			_step_menu_focus(1)
		if event.keycode == KEY_LEFT:
			_mutate_active_tray_row(-1)
		if event.keycode == KEY_RIGHT:
			_mutate_active_tray_row(1)
		if event.keycode == KEY_ENTER or event.keycode == KEY_SPACE:
			if _tray_mode() == "build" or _tray_mode() == "loadout":
				_mutate_active_tray_row(1)
			else:
				_activate_menu(menu_focus_index)
		if event.keycode == KEY_H:
			_activate_menu(0)
		if event.keycode == KEY_1:
			_focus_tray_row(0)
		if event.keycode == KEY_2:
			_focus_tray_row(1)
		if event.keycode == KEY_3:
			_focus_tray_row(2)
		if event.keycode == KEY_4:
			_focus_tray_row(3)
		if event.keycode == KEY_5:
			_focus_tray_row(4)

func _build_runtime_probes() -> void:
	setup_request = HTTPRequest.new()
	setup_request.name = "WorkshopSetupProbe"
	add_child(setup_request)
	setup_request.request_completed.connect(_on_setup_state_response)
	options_request = HTTPRequest.new()
	options_request.name = "WorkshopOptionsProbe"
	add_child(options_request)
	options_request.request_completed.connect(_on_creation_options_response)
	bot_save_request = HTTPRequest.new()
	bot_save_request.name = "WorkshopBotSave"
	add_child(bot_save_request)
	bot_save_request.request_completed.connect(_on_bot_save_response)

func _request_setup_state() -> void:
	if not setup_request or setup_request.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
		return
	var error := setup_request.request(SETUP_STATE_URL)
	if error != OK:
		setup_state_loaded = true
		setup_state_error = "daemon offline"
		_refresh_all_ui()

func _request_creation_options() -> void:
	if not options_request or options_request.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
		return
	var error := options_request.request(CREATION_OPTIONS_URL)
	if error != OK:
		creation_options = {}
		_refresh_all_ui()

func _tick_setup_poll(delta: float) -> void:
	setup_poll_clock += delta
	if setup_poll_clock < SETUP_POLL_INTERVAL:
		return
	setup_poll_clock = 0.0
	_request_setup_state()
	if bot_unsaved_local and not bot_save_pending:
		_request_bot_save()

func _on_setup_state_response(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	setup_state_loaded = true
	if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
		setup_state_error = "daemon offline"
		if bot_unsaved_local and not bot_save_pending:
			_add_terminal_line("POWER / OFFLINE")
		_refresh_all_ui()
		return
	var parsed := _parse_json_dictionary(body)
	if parsed.is_empty():
		setup_state_error = "bad response"
		_refresh_all_ui()
		return
	setup_state = parsed
	setup_state_error = ""
	if not bot_unsaved_local and not bot_save_pending:
		var bot_state = parsed.get("bot", {})
		if typeof(bot_state) == TYPE_DICTIONARY:
			persisted_bot = BotCatalog.normalize_bot_identity(bot_state.get("identity", {}))
			workshop_bot = persisted_bot.duplicate(true)
			_sync_selection_indices_from_bot()
	_refresh_all_ui()
	if bot_unsaved_local and not bot_save_pending:
		_request_bot_save()

func _on_creation_options_response(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
		creation_options = {}
		_refresh_all_ui()
		return
	creation_options = _parse_json_dictionary(body)
	_sync_selection_indices_from_bot()
	_refresh_all_ui()

func _queue_bot_save() -> void:
	bot_unsaved_local = true
	if bot_save_pending:
		bot_save_dirty = true
		_refresh_all_ui()
		return
	_request_bot_save()

func _request_bot_save() -> void:
	if not bot_save_request or bot_save_request.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
		bot_save_dirty = true
		return
	bot_save_pending = true
	bot_save_dirty = false
	workshop_bot["updatedAt"] = Time.get_datetime_string_from_system(true)
	var headers := PackedStringArray(["Content-Type: application/json"])
	var error := bot_save_request.request(BOT_IDENTITY_URL, headers, HTTPClient.METHOD_POST, JSON.stringify(workshop_bot))
	if error != OK:
		bot_save_pending = false
		bot_save_dirty = true
		setup_state_error = "daemon offline"
		_add_terminal_line("SAVE / LOCAL ONLY")
		_refresh_all_ui()
		return
	_refresh_all_ui()

func _on_bot_save_response(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	bot_save_pending = false
	if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
		bot_unsaved_local = true
		bot_save_dirty = true
		_add_terminal_line("SAVE / LOCAL ONLY")
		_refresh_all_ui()
		return
	var parsed := _parse_json_dictionary(body)
	if bot_save_dirty:
		persisted_bot = BotCatalog.normalize_bot_identity(parsed)
		_request_bot_save()
		_refresh_all_ui()
		return
	persisted_bot = BotCatalog.normalize_bot_identity(parsed)
	workshop_bot = persisted_bot.duplicate(true)
	bot_unsaved_local = false
	_sync_selection_indices_from_bot()
	_add_terminal_line("STAMP / ACTIVE BOT SAVED")
	_refresh_all_ui()
	_request_setup_state()

func _build_room() -> void:
	camera = Camera3D.new()
	camera.position = Vector3(0.0, 2.34, 5.7)
	camera.rotation_degrees = Vector3(-13.0, 0.0, 0.0)
	camera.fov = 56.0
	add_child(camera)

	var world_light := DirectionalLight3D.new()
	world_light.rotation_degrees = Vector3(-42, 22, 0)
	world_light.light_energy = 0.78
	add_child(world_light)

	lamp_light = OmniLight3D.new()
	lamp_light.position = Vector3(0.0, 3.62, -0.96)
	lamp_light.light_color = Color("#ffc36b")
	lamp_light.light_energy = 2.4
	add_child(lamp_light)

	tray_light = OmniLight3D.new()
	tray_light.position = Vector3(3.25, 1.65, 0.25)
	tray_light.light_color = Color("#8fe8ff")
	tray_light.light_energy = 0.2
	add_child(tray_light)

	_add_panel("WallPlate", "scene.wall", Vector2(14.2, 5.95), Vector3(0, 2.06, -2.72))
	_add_panel("TablePlate", "scene.table", Vector2(14.4, 1.34), Vector3(0, -0.82, -0.08))
	_add_box(self, "TableDepth", Vector3(9.8, 0.42, 3.1), Vector3(0, -1.0, 0.62), Color("#5e3427"))
	_add_panel("LampPlate", "scene.lamp", Vector2(1.78, 1.34), Vector3(0.0, 3.2, -1.68))
	_add_panel("SignPlate", "scene.sign", Vector2(3.55, 1.12), Vector3(0.0, 2.58, -1.54))

	_build_left_rail()
	_build_parts_tray()
	_build_monitor()
	_build_polish_props()
	_build_bench()
	_build_clawd()
	_build_status_pills()
	_build_props()

func _build_left_rail() -> void:
	_add_panel("LauncherRail", "scene.left-rail", Vector2(1.5, 2.25), Vector3(-3.06, 1.58, -0.2))
	for index in range(WORKSHOP_MENU_LABELS.size()):
		var y := 2.28 - float(index) * 0.44
		var slab := _add_panel("MenuSlab%s" % index, "scene.menu-slab.default", Vector2(1.1, 0.38), Vector3(-3.06, y, 0.06))
		var light := _add_sphere(self, "MenuLight%s" % index, 0.035, Vector3(-3.52, y - 0.01, 0.22), Color("#3a3128"))
		workshop_menu_slabs.append(slab)
		workshop_menu_lights.append(light)
		_add_world_label(WORKSHOP_MENU_LABELS[index], Vector3(-3.0, y - 0.025, 0.16), 17, Color("#23170f"))
		_add_click_area("ClickMenu%s" % index, Vector3(-3.06, y, 0.16), Vector3(1.22, 0.44, 0.54), "menu:%s" % WORKSHOP_MENU_IDS[index])
	_add_sphere(self, "TinyOptionsBead", 0.055, Vector3(-3.47, 0.54, 0.18), Color("#5b4631"))
	_add_sphere(self, "TinyQuitBead", 0.055, Vector3(-3.2, 0.54, 0.18), Color("#8d4b3d"))

func _build_parts_tray() -> void:
	_add_panel("PartsTray", "scene.right-tray", Vector2(1.68, 2.16), Vector3(2.56, 1.64, -0.12))
	tray_title_label = _add_world_label("PARTS RACK", Vector3(2.56, 2.52, 0.3), 19, Color("#23170f"))
	for index in range(5):
		var y := 2.22 - float(index) * 0.4
		var slot := _add_panel("TraySlot%s" % index, "scene.tray-slot.empty", Vector2(1.34, 0.3), Vector3(2.58, y, 0.16))
		var light := _add_sphere(self, "TrayLight%s" % index, 0.034, Vector3(2.05, y - 0.02, 0.32), Color("#6b6259"))
		var key_label := _add_world_label("ROW", Vector3(2.34, y - 0.02, 0.28), 15, Color("#23170f"))
		var value_label := _add_world_label("...", Vector3(2.87, y - 0.02, 0.28), 12, Color("#4c3524"))
		workshop_tray_slots.append(slot)
		workshop_tray_lights.append(light)
		tray_row_key_labels.append(key_label)
		tray_row_value_labels.append(value_label)
		_add_click_area("ClickTrayRow%s" % index, Vector3(2.58, y, 0.16), Vector3(1.36, 0.38, 0.54), "tray:%s" % index)

func _build_monitor() -> void:
	monitor_panel = _add_panel("AgentMonitor", "scene.monitor", Vector2(1.2, 1.0), Vector3(1.65, 0.92, 0.42))
	monitor_panel.rotation_degrees.y = -18.0
	monitor_label = _add_world_label("AGENT / IDLE", Vector3(1.58, 0.94, 0.58), 11, Color("#e5f6bd"))
	monitor_label.rotation_degrees.y = -18.0
	monitor_label.modulate.a = 0.82
	monitor_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	monitor_label.custom_minimum_size = Vector2(160, 100)

func _build_polish_props() -> void:
	battery_node = _add_panel("BudgetBattery", "scene.battery", Vector2(0.6, 0.8), Vector3(-1.82, 1.15, -1.82))
	battery_node.rotation_degrees.y = 22.0
	spool_node = _add_panel("DataSpool", "scene.data-spool", Vector2(0.72, 0.72), Vector3(-3.24, -1.18, 1.05))
	spool_node.rotation_degrees.x = -80.0
	switch_node = _add_panel("LampSwitch", "scene.lamp-switch", Vector2(0.4, 0.4), Vector3(1.2, 2.5, -1.72))
	switch_node.rotation_degrees.y = -5.0
	_add_world_label("BATTERY", Vector3(-1.82, 0.65, -1.6), 10, Color("#d7c999"))
	_add_world_label("SPOOL", Vector3(-3.24, -0.74, 1.25), 12, Color("#f8e6b2"))
	_add_world_label("LINK", Vector3(1.2, 2.15, -1.6), 11, Color("#f8e6b2"))

func _build_bench() -> void:
	_add_panel("PedestalPlate", "scene.pedestal", Vector2(2.58, 1.27), Vector3(0, 0.42, 0.14))
	_add_box(self, "BenchShadow", Vector3(2.65, 0.035, 0.42), Vector3(0, 0.13, 0.28), Color("#2c1d17"))
	for step in range(6):
		var x := -0.98 + float(step) * 0.39
		var trace := _add_box(self, "BenchTrace%s" % step, Vector3(0.18, 0.035, 0.04), Vector3(x, 0.68, 0.38), Color("#385761"))
		trace_nodes.append(trace)

func _build_clawd() -> void:
	bot_rig = Node3D.new()
	bot_rig.name = "ClawdWorkbenchBot"
	bot_rig.position = Vector3(0, 0.78, 0.58)
	add_child(bot_rig)

	bot_body = _add_panel_to(bot_rig, "ClawdBody", "bot.clawd.body", Vector2(1.74, 1.74), Vector3(0.0, 0.48, 0.16))
	eye_panel = _add_panel_to(bot_rig, "PixelEyes", "bot.clawd.eye.pixel", Vector2(0.82, 0.42), Vector3(0.02, 0.62, 0.34))
	eye_orb_left = _add_sphere(bot_rig, "EyeOrbLeft", 0.07, Vector3(-0.18, 0.62, 0.38), Color("#dff8ff"))
	eye_orb_right = _add_sphere(bot_rig, "EyeOrbRight", 0.07, Vector3(0.18, 0.62, 0.38), Color("#dff8ff"))
	eye_lens_core = _add_sphere(bot_rig, "EyeLensCore", 0.16, Vector3(0.0, 0.62, 0.39), Color("#dff8ff"))
	lens_part = _add_panel_to(bot_rig, "XRayLens", "bot.clawd.skill.eye", Vector2(0.43, 0.43), Vector3(-0.64, 0.56, 0.42))
	badge_part = _add_panel_to(bot_rig, "ExplainBadge", "bot.clawd.skill.badge", Vector2(0.38, 0.38), Vector3(0.72, 0.56, 0.42))
	side_part = _add_panel_to(bot_rig, "RepoSidePart", "bot.clawd.skill.side", Vector2(0.42, 0.42), Vector3(-0.84, 0.25, 0.28))
	crown_part = _add_panel_to(bot_rig, "CiteCrown", "bot.clawd.skill.crown", Vector2(0.44, 0.44), Vector3(0.02, 1.15, 0.28))
	charm_part = _add_panel_to(bot_rig, "WatchCharm", "bot.clawd.skill.charm", Vector2(0.34, 0.34), Vector3(0.84, 0.25, 0.28))
	body_antenna_left = _add_box(bot_rig, "BodyAntennaLeft", Vector3(0.06, 0.42, 0.06), Vector3(-0.26, 1.12, 0.18), Color("#4f6848"))
	body_antenna_right = _add_box(bot_rig, "BodyAntennaRight", Vector3(0.06, 0.32, 0.06), Vector3(0.23, 1.05, 0.18), Color("#4f6848"))
	body_shield = _add_box(bot_rig, "BodyShield", Vector3(0.28, 0.2, 0.08), Vector3(0.58, 0.78, 0.38), Color("#ffe0a3"))
	body_orb_glow = _add_sphere(bot_rig, "BodyOrbGlow", 0.11, Vector3(0.0, 0.46, 0.26), Color("#ffd88a"))
	body_core_bead_left = _add_sphere(bot_rig, "BodyCoreBeadLeft", 0.07, Vector3(-0.16, 0.98, 0.22), Color("#d7c999"))
	body_core_bead_right = _add_sphere(bot_rig, "BodyCoreBeadRight", 0.07, Vector3(0.16, 0.98, 0.22), Color("#d7c999"))

func _build_status_pills() -> void:
	for index in range(STATUS_PILL_IDS.size()):
		var x := -3.72 + float(index) * 1.1
		var panel := _add_panel("StatusPill%s" % index, "scene.status-pill", Vector2(1.0, 0.34), Vector3(x, -0.34, 1.18))
		status_pill_panels.append(panel)
		status_pill_title_labels.append(_add_world_label(STATUS_PILL_LABELS[index], Vector3(x + 0.08, -0.35, 1.31), 15, Color("#d7c999")))
		status_pill_state_labels.append(_add_world_label("WAIT", Vector3(x + 0.02, -0.54, 1.31), 10, Color("#6b6259")))
	_add_panel("BotCard", "scene.bottom-card", Vector2(2.4, 0.78), Vector3(0.0, -0.42, 1.12))
	identity_title_label = _add_world_label("ACTIVE SPORE", Vector3(-0.72, -0.22, 1.31), 12, Color("#23170f"))
	identity_name_label = _add_world_label("CLAWD", Vector3(-0.52, -0.42, 1.32), 28, Color("#23170f"))
	identity_meta_label = _add_world_label("ORB / LAVENDER / GLOW", Vector3(0.28, -0.53, 1.31), 10, Color("#4c3524"))
	identity_skill_label = _add_world_label("EYE X-RAY / SIDE REPO / BADGE EXPLAIN", Vector3(-0.62, -0.70, 1.31), 9, Color("#8a6a43"))
	identity_note_label = _add_world_label("SYNCED / ACTIVE BOT", Vector3(0.82, -0.22, 1.31), 10, Color("#8a6a43"))

func _build_props() -> void:
	_add_box(self, "BackShelf", Vector3(2.0, 0.12, 0.2), Vector3(3.2, 2.45, -1.32), Color("#65402f"))
	_add_box(self, "ShelfBookA", Vector3(0.22, 0.5, 0.16), Vector3(3.0, 2.72, -1.2), Color("#735a43"))
	_add_box(self, "ShelfBookB", Vector3(0.25, 0.62, 0.16), Vector3(3.32, 2.78, -1.2), Color("#4f6848"))
	prop_nodes["repo_stamp"] = _add_box(self, "RepoStampPad", Vector3(0.58, 0.16, 0.44), Vector3(-1.72, -1.16, 1.0), Color("#8f5a3d"))
	prop_nodes["repo_stamp_handle"] = _add_box(self, "RepoStampHandle", Vector3(0.18, 0.38, 0.18), Vector3(-1.72, -0.9, 1.0), Color("#c39a66"))
	prop_nodes["browser_crank"] = _add_sphere(self, "BrowserCrankKnob", 0.2, Vector3(1.66, -1.05, 1.0), Color("#6f7b58"))
	prop_nodes["browser_base"] = _add_box(self, "BrowserCrankBase", Vector3(0.72, 0.12, 0.42), Vector3(1.66, -1.24, 1.0), Color("#4f6848"))
	prop_nodes["care_bell"] = _add_sphere(self, "CareBell", 0.2, Vector3(0.0, -1.08, 1.08), Color("#d8a849"))
	prop_nodes["signal_fruit"] = _add_sphere(self, "SignalFruit", 0.16, Vector3(0.66, -1.22, 1.16), Color("#a95442"))
	_add_world_label("STAMP", Vector3(-1.98, -0.74, 1.22), 13, Color("#f8e6b2"))
	_add_world_label("CRANK", Vector3(1.38, -0.74, 1.22), 13, Color("#f8e6b2"))
	_add_world_label("BELL", Vector3(-0.18, -0.74, 1.28), 13, Color("#f8e6b2"))
	_add_click_area("ClickRepoStamp", Vector3(-1.72, -1.0, 1.0), Vector3(0.9, 0.7, 0.7), "repo")
	_add_click_area("ClickBrowserCrank", Vector3(1.66, -1.02, 1.0), Vector3(0.9, 0.7, 0.7), "browser")
	_add_click_area("ClickCareBell", Vector3(0.0, -1.0, 1.08), Vector3(0.62, 0.62, 0.62), "care")

func _build_hud() -> void:
	var hud := CanvasLayer.new()
	add_child(hud)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.add_child(root)

	var top_row := HBoxContainer.new()
	top_row.position = Vector2(24, 20)
	top_row.custom_minimum_size = Vector2(450, 34)
	top_row.add_theme_constant_override("separation", 16)
	root.add_child(top_row)

	var title := Label.new()
	title.text = "SUPERIOR ."
	title.add_theme_font_size_override("font_size", 18)
	top_row.add_child(title)

	status_label = Label.new()
	status_label.text = "WORKSHOP / WAITING"
	status_label.add_theme_font_size_override("font_size", 12)
	top_row.add_child(status_label)

	stats_label = Label.new()
	stats_label.text = "SYNC 00  HEAT 00"
	stats_label.add_theme_font_size_override("font_size", 12)
	stats_label.visible = false
	top_row.add_child(stats_label)

	var terminal_panel := PanelContainer.new()
	terminal_panel.position = Vector2(24, 640)
	terminal_panel.custom_minimum_size = Vector2(320, 54)
	root.add_child(terminal_panel)

	terminal = RichTextLabel.new()
	terminal.custom_minimum_size = Vector2(298, 32)
	terminal.bbcode_enabled = true
	terminal.scroll_active = false
	terminal.add_theme_font_size_override("normal_font_size", 12)
	terminal_panel.add_child(terminal)

	signal_label = Label.new()
	signal_label.position = Vector2(734, 620)
	signal_label.size = Vector2(420, 24)
	signal_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	signal_label.text = _menu_prompt_text(menu_focus_index)
	signal_label.add_theme_font_size_override("font_size", 14)
	root.add_child(signal_label)

	_add_crt_pass(root)

func _build_sfx() -> void:
	sfx_player = SFX_PLAYER.new()
	add_child(sfx_player)

func _refresh_all_ui() -> void:
	_sync_selection_indices_from_bot()
	_apply_bot_visuals()
	_refresh_tray_rows()
	_refresh_status_pills()
	_refresh_identity_card()
	_refresh_runtime_status()
	_sync_signal_prompt()
	
	# UI Cleanup: Focus on bot and monitor during agent activity
	var agent_active := reaction_timer > 0.0 and (reaction_kind == "agent" or reaction_kind == "repo" or reaction_kind == "browser")
	if identity_title_label: identity_title_label.visible = not agent_active
	if identity_name_label: identity_name_label.visible = not agent_active
	if identity_meta_label: identity_meta_label.visible = not agent_active
	if identity_skill_label: identity_skill_label.visible = not agent_active
	if identity_note_label: identity_note_label.visible = not agent_active
	if stats_label: stats_label.visible = not agent_active and showcase_mode

func _refresh_runtime_status() -> void:
	if not status_label:
		return
	if bot_save_pending:
		status_label.text = "WORKSHOP / SAVING"
		return
	if setup_state_error != "":
		status_label.text = "WORKSHOP / OFFLINE"
		return
	match realtime_status:
		"online":
			status_label.text = "WORKSHOP / LIVE"
		"mock":
			status_label.text = "WORKSHOP / LOCAL"
		"connecting":
			status_label.text = "WORKSHOP / CONNECTING"
		_:
			status_label.text = "WORKSHOP / READY"

func _refresh_status_pills() -> void:
	var pill_states := [
		_status_pill_state("power"),
		_status_pill_state("key"),
		_status_pill_state("hand")
	]
	for index in range(status_pill_panels.size()):
		var panel := status_pill_panels[index]
		var title_label := status_pill_title_labels[index]
		var state_label := status_pill_state_labels[index]
		var pill_state: Dictionary = pill_states[index]
		if panel and panel.material_override:
			panel.material_override.albedo_color = pill_state.get("color", Color("#4e463f"))
		if title_label:
			title_label.modulate = pill_state.get("titleColor", Color("#d7c999"))
		if state_label:
			state_label.text = str(pill_state.get("text", "WAIT"))
			state_label.modulate = pill_state.get("textColor", Color("#23170f"))

func _status_pill_state(pill_id: String) -> Dictionary:
	if not setup_state_loaded and setup_state_error == "":
		return {"text": "WAIT", "color": Color("#4e463f"), "titleColor": Color("#9f9282"), "textColor": Color("#d7c999")}
	if pill_id == "power":
		if setup_state_error != "":
			return {"text": "OFFLINE", "color": Color("#6a4035"), "titleColor": Color("#f0cd7a"), "textColor": Color("#ffe0a3")}
		return {"text": "AWAKE", "color": Color("#547946"), "titleColor": Color("#d7c999"), "textColor": Color("#d9ffb0")}
	if pill_id == "key":
		if setup_state_error != "":
			return {"text": "WAIT", "color": Color("#4e463f"), "titleColor": Color("#9f9282"), "textColor": Color("#d7c999")}
		var key_ready := _setup_key_ready()
		return {"text": "READY" if key_ready else "MISSING", "color": Color("#547946") if key_ready else Color("#7b5a33"), "titleColor": Color("#d7c999"), "textColor": Color("#d9ffb0") if key_ready else Color("#ffe0a3")}
	var browser_status := _setup_browser_status()
	match browser_status:
		"paired":
			return {"text": "READY", "color": Color("#547946"), "titleColor": Color("#d7c999"), "textColor": Color("#d9ffb0")}
		"pairing":
			return {"text": "PAIRING", "color": Color("#6a6c3a"), "titleColor": Color("#f0cd7a"), "textColor": Color("#fff0a8")}
		"offline":
			return {"text": "OFFLINE", "color": Color("#6a4035"), "titleColor": Color("#f0cd7a"), "textColor": Color("#ffe0a3")}
		_:
			return {"text": "UNBOUND", "color": Color("#4e463f"), "titleColor": Color("#d7c999"), "textColor": Color("#c5baa9")}

func _refresh_identity_card() -> void:
	if identity_title_label:
		identity_title_label.text = "LOCAL SPORE" if bot_unsaved_local else "ACTIVE SPORE"
	if identity_name_label:
		identity_name_label.text = str(workshop_bot.get("name", "Clawd")).to_upper()
	if identity_meta_label:
		identity_meta_label.text = BotCatalog.format_identity_meta(workshop_bot)
	if identity_skill_label:
		identity_skill_label.text = BotCatalog.format_loadout_meta(workshop_bot)
	if identity_note_label:
		identity_note_label.text = _identity_note_copy()

func _identity_note_copy() -> String:
	if bot_save_pending:
		return "STAMP / SAVING"
	if bot_unsaved_local:
		return "LOCAL ONLY / POWER OFF"
	match _tray_mode():
		"build":
			return "BUILD / SHAPE BENCH"
		"loadout":
			return "LOADOUT / SLOT RACK"
		"browser":
			return "BROWSER / HAND DOCK"
		_:
			return "SYNCED / ACTIVE BOT"

func _refresh_tray_rows() -> void:
	tray_row_models.clear()
	if tray_title_label:
		match _tray_mode():
			"build":
				tray_title_label.text = "BUILD SHELL"
			"loadout":
				tray_title_label.text = "LOADOUT RACK"
			"browser":
				tray_title_label.text = "HAND DOCK"
			_:
				tray_title_label.text = "PARTS RACK"
	for index in range(workshop_tray_slots.size()):
		var model := _tray_row_model(index)
		tray_row_models.append(model)
		var slot := workshop_tray_slots[index]
		var light := workshop_tray_lights[index]
		var key_label := tray_row_key_labels[index]
		var value_label := tray_row_value_labels[index]
		if slot:
			slot.material_override = _texture_material("scene.tray-slot.equipped" if bool(model.get("filled", false)) else "scene.tray-slot.empty")
		if light and light.material_override:
			light.material_override.albedo_color = model.get("lightColor", Color("#6b6259"))
		if key_label:
			key_label.text = str(model.get("key", "ROW"))
			key_label.modulate = model.get("keyColor", Color("#23170f"))
		if value_label:
			value_label.text = str(model.get("value", "..."))
			value_label.modulate = model.get("valueColor", Color("#4c3524"))

func _tray_row_model(index: int) -> Dictionary:
	match _tray_mode():
		"build":
			return _build_row_model(index)
		"loadout":
			return _loadout_row_model(index)
		"browser":
			return _browser_row_model(index)
		_:
			return {"key": "ROW", "value": "...", "filled": false, "lightColor": Color("#6b6259"), "keyColor": Color("#23170f"), "valueColor": Color("#4c3524")}

func _build_row_model(index: int) -> Dictionary:
	if index == 0:
		return _active_row(index, "BODY", BotCatalog.body_label(str(workshop_bot.get("body", "orb"))), true)
	if index == 1:
		return _active_row(index, "PIGMENT", BotCatalog.pigment_label(str(workshop_bot.get("color", "lavender"))), true)
	return _active_row(index, "EYE", BotCatalog.eye_label(str(workshop_bot.get("eye", "glow"))), true)

func _loadout_row_model(index: int) -> Dictionary:
	var slot_order := BotCatalog.slot_order()
	if index >= slot_order.size():
		return {"key": "ROW", "value": "...", "filled": false, "lightColor": Color("#6b6259"), "keyColor": Color("#23170f"), "valueColor": Color("#4c3524")}
	
	var slot_id := str(slot_order[index])
	var skill_id := BotCatalog.equipped_skill_for_slot(workshop_bot, slot_id)
	var filled := skill_id != ""
	var value := "%s FIT" % BotCatalog.skill_short_label(skill_id) if filled else "EMPTY"
	var model := _active_row(index, BotCatalog.slot_label(slot_id), value, filled)
	model["valueColor"] = Color("#d9ffb0") if filled else Color("#8f8170")
	model["lightColor"] = Color("#72d968") if filled else Color("#6b6259")
	return model

func _browser_row_model(index: int) -> Dictionary:
	if index == 0:
		var power_text := "WAIT"
		var power_ready := false
		var power_light := Color("#6b6259")
		if setup_state_error != "":
			power_text = "OFFLINE"
			power_light = Color("#9e5c49")
		elif setup_state_loaded:
			power_text = "AWAKE"
			power_ready = true
			power_light = Color("#72d968")
		return _active_row(index, "POWER", power_text, power_ready, power_light)
	if index == 1:
		var key_text := "WAIT"
		var key_ready := false
		var key_light := Color("#6b6259")
		if setup_state_loaded:
			key_ready = _setup_key_ready()
			key_text = "READY" if key_ready else "MISSING"
			key_light = Color("#72d968") if key_ready else Color("#c39a66")
		return _active_row(index, "KEY", key_text, key_ready, key_light)
	if index == 2:
		var browser_status := _setup_browser_status()
		var browser_text := browser_status.to_upper()
		var filled := browser_status == "paired"
		var light_color := Color("#72d968") if filled else Color("#d8a849") if browser_status == "pairing" else Color("#6b6259")
		return _active_row(index, "HAND", browser_text if browser_text != "" else "WAIT", filled, light_color)
	
	return {"key": "ROW", "value": "...", "filled": false, "lightColor": Color("#6b6259"), "keyColor": Color("#23170f"), "valueColor": Color("#4c3524")}

func _active_row(index: int, key: String, value: String, filled: bool, light_color: Color = Color("#8fe8ff")) -> Dictionary:
	var active := tray_focus_index == index
	return {
		"key": key,
		"value": value,
		"filled": filled,
		"lightColor": Color("#ffd36b") if active else light_color if filled else Color("#6b6259"),
		"keyColor": Color("#fff0a8") if active else Color("#23170f"),
		"valueColor": Color("#f8e6b2") if active else Color("#4c3524")
	}

func _apply_bot_visuals() -> void:
	var pigment := BotCatalog.pigment_info(str(workshop_bot.get("color", "lavender")))
	var body_id := str(workshop_bot.get("body", "orb"))
	var eye_id := str(workshop_bot.get("eye", "glow"))
	if bot_body and bot_body.material_override:
		bot_body.material_override.albedo_color = pigment.get("color", Color.WHITE)
	_apply_body_style(body_id, pigment)
	_apply_eye_style(eye_id)
	_apply_skill_style(pigment)

func _apply_body_style(body_id: String, pigment: Dictionary) -> void:
	if not bot_body:
		return
	var shadow = pigment.get("shadow", Color("#4e463f"))
	var highlight = pigment.get("highlight", Color("#fff8ec"))
	bot_body.position = Vector3(0.0, 0.48, 0.16)
	match body_id:
		"scanner":
			bot_body.scale = Vector3(0.96, 0.88, 1.0)
		"sentinel":
			bot_body.scale = Vector3(1.02, 0.96, 1.0)
		"core":
			bot_body.scale = Vector3(0.88, 0.88, 1.0)
		"gremlin":
			bot_body.scale = Vector3(1.0, 1.0, 1.0)
		_:
			bot_body.scale = Vector3(1.08, 1.08, 1.0)
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
		eye_orb_left.scale = Vector3.ONE * (1.16 if eye_id == "glow" else 0.72)
	if eye_orb_right and eye_orb_right.material_override:
		eye_orb_right.visible = eye_id == "dot" or eye_id == "glow"
		eye_orb_right.material_override.albedo_color = eye_color
		eye_orb_right.scale = Vector3.ONE * (1.16 if eye_id == "glow" else 0.72)
	if eye_lens_core and eye_lens_core.material_override:
		eye_lens_core.visible = eye_id == "lens"
		eye_lens_core.material_override.albedo_color = eye_color

func _apply_skill_style(pigment: Dictionary) -> void:
	var highlight = pigment.get("highlight", Color("#f0cd7a"))
	var shadow = pigment.get("shadow", Color("#4e463f"))
	var eye_skill := BotCatalog.equipped_skill_for_slot(workshop_bot, "eye")
	var side_skill := BotCatalog.equipped_skill_for_slot(workshop_bot, "side")
	var badge_skill := BotCatalog.equipped_skill_for_slot(workshop_bot, "badge")
	var crown_skill := BotCatalog.equipped_skill_for_slot(workshop_bot, "crown")
	var charm_skill := BotCatalog.equipped_skill_for_slot(workshop_bot, "charm")
	if lens_part and lens_part.material_override:
		lens_part.visible = eye_skill != ""
		lens_part.material_override.albedo_color = highlight
	if side_part and side_part.material_override:
		side_part.visible = side_skill != ""
		side_part.material_override.albedo_color = shadow
	if badge_part and badge_part.material_override:
		badge_part.visible = badge_skill != ""
		badge_part.material_override.albedo_color = Color("#f0cd7a")
	if crown_part and crown_part.material_override:
		crown_part.visible = crown_skill != ""
		crown_part.material_override.albedo_color = Color("#dbad52")
	if charm_part and charm_part.material_override:
		charm_part.visible = charm_skill != ""
		charm_part.material_override.albedo_color = Color("#f2e3c0")

func _sync_selection_indices_from_bot() -> void:
	build_body_index = _option_index_by_id(_body_options(), str(workshop_bot.get("body", "orb")))
	build_color_index = _option_index_by_id(_color_options(), str(workshop_bot.get("color", "lavender")))
	build_eye_index = _option_index_by_id(_eye_options(), str(workshop_bot.get("eye", "glow")))
	tray_focus_index = clamp(tray_focus_index, 0, 2)

func _body_options() -> Array:
	var shapes = creation_options.get("shapes", [])
	if shapes is Array and not shapes.is_empty():
		return shapes
	return BotCatalog.body_options()

func _color_options() -> Array:
	return BotCatalog.color_ids()

func _eye_options() -> Array:
	return BotCatalog.eye_options()

func _option_index_by_id(options: Array, target_id: String) -> int:
	for index in range(options.size()):
		var option = options[index]
		if typeof(option) == TYPE_DICTIONARY:
			if str(option.get("id", "")) == target_id:
				return index
		elif str(option) == target_id:
			return index
	return 0

func _update_bot_motion() -> void:
	if not bot_rig:
		return
	var reaction := reaction_timer / 0.65
	var wobble := sin(pulse * 1.4) * 0.025
	var snap := 0.0
	if reaction_kind == "agent":
		snap = sin(reaction * PI) * 0.16
	bot_rig.position.y = 0.78 + wobble + max(0.0, snap * 0.28)
	bot_rig.rotation.z = sin(pulse * 0.85) * 0.015
	bot_rig.scale = Vector3(1.0 + snap * 0.1, 1.0 - snap * 0.13, 1.0)
	if camera:
		camera.position.x = sin(pulse * 0.2) * 0.08
		camera.position.y = 2.34 + cos(pulse * 0.24) * 0.03
		camera.rotation_degrees.x = -13.0 + sin(pulse * 0.2) * 0.6
	if eye_panel and eye_panel.visible:
		var blink := int(pulse * 2.0) % 6 == 0 or (reaction_kind == "browser" and reaction_timer > 0.26)
		eye_panel.scale.y = 0.18 if blink else 1.0
		
		# Eye tracking: follow mouse within constrained range
		var mouse_pos := get_viewport().get_mouse_position()
		var view_size := get_viewport().get_visible_rect().size
		var normalized_mouse := (mouse_pos / view_size) * 2.0 - Vector2.ONE
		var eye_offset := normalized_mouse * 0.05
		eye_panel.position = Vector3(0.02 + eye_offset.x, 0.62 - eye_offset.y, 0.34)

	if eye_orb_left and eye_orb_left.visible:
		eye_orb_left.scale.z = 0.78 if int(pulse * 2.0) % 7 == 0 else 1.0
	if eye_orb_right and eye_orb_right.visible:
		eye_orb_right.scale.z = 0.78 if int(pulse * 2.0) % 7 == 0 else 1.0
	if eye_lens_core and eye_lens_core.visible:
		eye_lens_core.scale = Vector3.ONE * (1.0 + sin(pulse * 2.2) * 0.04)
	if lens_part:
		var lens_glow := (sin(reaction_timer * 14.0) * 0.11 if reaction_kind == "browser" or reaction_kind == "loadout" else 0.0)
		if reaction_kind == "agent" and reaction_timer > 0.0:
			lens_glow = 0.08 + absf(sin(pulse * 8.0)) * 0.06
		lens_part.scale = Vector3.ONE * (1.0 + lens_glow)
		if lens_part.material_override:
			var base_color = lens_part.material_override.albedo_color
			lens_part.material_override.emission_enabled = reaction_timer > 0.0 and (reaction_kind == "agent" or reaction_kind == "browser")
			lens_part.material_override.emission = Color("#8fe8ff") if reaction_kind == "agent" else Color("#fff0b1")
			lens_part.material_override.emission_energy_multiplier = 0.8 * (reaction_timer / 0.65)

	if badge_part:
		badge_part.scale = Vector3.ONE * (1.0 + (sin(reaction_timer * 12.0) * 0.13 if reaction_kind == "agent" or reaction_kind == "loadout" else 0.0))
	if side_part:
		var gear_spin := (sin(reaction_timer * 10.0) * 0.12 if reaction_kind == "repo" or reaction_kind == "loadout" else 0.0)
		if reaction_kind == "repo" and reaction_timer > 0.0:
			side_part.rotation.z += delta * 12.0
		side_part.scale = Vector3.ONE * (1.0 + gear_spin)
	if crown_part:
		var crown_pulse := (sin(reaction_timer * 11.0) * 0.14 if reaction_kind == "loadout" else 0.0)
		if reaction_kind == "market" and reaction_timer > 0.0:
			crown_pulse = 0.06 + absf(sin(pulse * 6.0)) * 0.08
		crown_part.scale = Vector3.ONE * (1.0 + crown_pulse)
	if charm_part:
		var charm_pulse := (sin(reaction_timer * 13.0) * 0.15 if reaction_kind == "loadout" else 0.0)
		if reaction_kind == "system" and reaction_timer > 0.0:
			charm_pulse = absf(sin(pulse * 10.0)) * 0.12
		charm_part.scale = Vector3.ONE * (1.0 + charm_pulse)

func _update_lights() -> void:
	if lamp_light:
		lamp_light.light_energy = 2.05 + sin(pulse * 2.2) * 0.22 + (reaction_timer * 1.5 if reaction_kind == "agent" else 0.0)
	if tray_light:
		var tray_boost := 0.0
		if reaction_kind == "browser":
			tray_boost = reaction_timer * 2.3
		elif reaction_kind == "loadout" or reaction_kind == "build":
			tray_boost = reaction_timer * 1.8
		tray_light.light_energy = 0.2 + tray_boost
	for trace in trace_nodes:
		if trace and trace.material_override:
			trace.material_override.albedo_color = Color("#8fe8ff") if reaction_kind == "repo" and reaction_timer > 0.0 else Color("#385761")
	_update_menu_animation()
	_update_prop_animation()

func _update_menu_animation() -> void:
	var focus_pulse := 0.5 + absf(sin(pulse * 4.0)) * 0.5
	for index in range(workshop_menu_slabs.size()):
		var active := index == menu_focus_index
		var slab := workshop_menu_slabs[index]
		var light := workshop_menu_lights[index]
		if slab:
			slab.material_override = _texture_material("scene.menu-slab.pressed" if active else "scene.menu-slab.default")
			slab.scale = Vector3(1.06, 0.92, 1.0) if active else Vector3.ONE
		if light and light.material_override:
			light.material_override.albedo_color = Color("#ffd36b").lerp(Color("#72d968"), focus_pulse) if active else Color("#3a3128")
			light.scale = Vector3.ONE * (1.25 if active else 1.0)
	for index in range(workshop_tray_slots.size()):
		var slot := workshop_tray_slots[index]
		var light := workshop_tray_lights[index]
		var active_row := index == tray_focus_index and (_tray_mode() == "build" or _tray_mode() == "loadout" or _tray_mode() == "browser")
		if slot:
			slot.scale = Vector3(1.08, 1.04, 1.0) if active_row else Vector3.ONE
		if light and light.material_override:
			light.scale = Vector3.ONE * (1.18 if active_row else 1.0)

func _update_prop_animation() -> void:
	var press := sin((reaction_timer / 0.65) * PI)
	if prop_nodes.has("browser_crank"):
		var crank: MeshInstance3D = prop_nodes["browser_crank"]
		crank.rotation.z = pulse * 1.2 + (press * 2.6 if reaction_kind == "browser" else 0.0)
		crank.scale = Vector3.ONE * (1.0 + press * 0.22 if reaction_kind == "browser" else 1.0)
	if prop_nodes.has("repo_stamp_handle"):
		var stamp: MeshInstance3D = prop_nodes["repo_stamp_handle"]
		stamp.position.y = -0.9 - (press * 0.2 if reaction_kind == "repo" else 0.0)
		stamp.rotation.z = sin(pulse * 0.8) * 0.04
	if prop_nodes.has("care_bell"):
		var bell: MeshInstance3D = prop_nodes["care_bell"]
		bell.position.y = -1.08 + (press * 0.2 if reaction_kind == "care" else sin(pulse * 1.8) * 0.015)
		bell.rotation.z = (sin(pulse * 12.0) * 0.18 if reaction_kind == "care" and reaction_timer > 0.0 else 0.0)
	if prop_nodes.has("signal_fruit"):
		var fruit: MeshInstance3D = prop_nodes["signal_fruit"]
		fruit.position.y = -1.22 + sin(pulse * 2.2) * 0.025
	
	if battery_node:
		var low_budget := setup_state_error != ""
		battery_node.scale = Vector3.ONE * (1.0 + absf(sin(pulse * 0.8)) * 0.02 if low_budget else 1.0)
		if battery_node.material_override:
			battery_node.material_override.emission_enabled = low_budget
			battery_node.material_override.emission = Color("#9e5c49")
			battery_node.material_override.emission_energy_multiplier = absf(sin(pulse * 4.0)) * 0.4

	if spool_node:
		var spinning := reaction_timer > 0.0 and (reaction_kind == "repo" or reaction_kind == "agent")
		if spinning:
			spool_node.rotation.z += delta * 15.0
		spool_node.scale = Vector3.ONE * (1.05 if spinning else 1.0)

	if switch_node:
		var state := 1.0 if reaction_timer > 0.0 and reaction_kind == "agent" else 0.0
		switch_node.rotation.x = lerp_angle(switch_node.rotation.x, deg_to_rad(-15.0 if state > 0.5 else 15.0), 0.15)

func _update_stats() -> void:
	if stats_label and stats_label.visible:
		var sync := 48 + int(abs(sin(pulse * 1.2)) * 44.0)
		var heat := 18 + int(abs(sin(pulse * 0.8)) * 12.0)
		stats_label.text = "SYNC %02d  HEAT %02d" % [sync, heat]

func _on_server_status_changed(status: String) -> void:
	realtime_status = status
	_refresh_runtime_status()

func _on_realtime_message(message: Dictionary) -> void:
	if message.has("event"):
		var event: Dictionary = message["event"]
		latest_intensity = int(event.get("intensity", 1))
		var kind := str(event.get("kind", "signal"))
		var event_label := str(event.get("label", "Signal"))
		if showcase_mode and event_label.begins_with("MOCK "):
			event_label = event_label.substr(5)
		var label := "%s / %s" % [kind.to_upper(), event_label]
		if bool(message.get("mock", false)) and not showcase_mode:
			label = "MOCK " + label
		
		if monitor_label:
			monitor_text_target = label
			monitor_typing_clock = 0.0
			monitor_label.modulate = Color("#e5f6bd") if kind != "system" else Color("#f6bdbe")
		
		_trigger_reaction(kind)
		_add_terminal_line(label)
		_show_signal_message("LAST / %s" % label)
		return
	_add_terminal_line("%s / PATCH RECEIVED" % str(message.get("type", "message")).to_upper())

func _trigger_reaction(kind: String) -> void:
	reaction_kind = kind
	reaction_timer = 0.65
	match kind:
		"browser":
			menu_focus_index = 3
		"build":
			menu_focus_index = 1
		"loadout":
			menu_focus_index = 2
		"repo":
			menu_focus_index = 2
		"agent":
			menu_focus_index = 1
		"care":
			menu_focus_index = 0
		_:
			pass
	if not sfx_player:
		return
	match kind:
		"browser":
			sfx_player.play_sfx("browser_bind", 0.72)
		"build":
			sfx_player.play_sfx("select", 0.62)
		"loadout":
			sfx_player.play_sfx("attach", 0.74)
		"repo":
			sfx_player.play_sfx("repo", 0.82)
		"agent":
			sfx_player.play_sfx("attach", 0.82)
		"care":
			sfx_player.play_sfx("play", 0.78)
		"system":
			sfx_player.play_sfx("step", 0.45)
		_:
			sfx_player.play_sfx("signal", 0.55)

func _update_video_proof_reactions() -> void:
	if OS.get_environment("SUPERIOR_VIDEO_PROOF") != "1":
		return
	var beat_1 := 0.9 if showcase_mode else 1.2
	var beat_2 := 2.1 if showcase_mode else 2.9
	var beat_3 := 3.2 if showcase_mode else 4.1
	var beat_4 := 4.4 if showcase_mode else 5.4
	if video_reaction_step == 0 and pulse > beat_1:
		video_reaction_step = 1
		menu_focus_index = 1
		tray_focus_index = 0
		_mutate_build_row(0, 1)
	if video_reaction_step == 1 and pulse > beat_2:
		video_reaction_step = 2
		menu_focus_index = 2
		tray_focus_index = 2
		_toggle_loadout_row(2)
	if video_reaction_step == 2 and pulse > beat_3:
		video_reaction_step = 3
		menu_focus_index = 3
		_trigger_reaction("browser")
		realtime_client.send_signal("browser", "BROWSER HAND PULSE", 2)
		_show_signal_message("CHECK / HAND")
	if video_reaction_step == 3 and pulse > beat_4:
		video_reaction_step = 4
		_trigger_reaction("repo")
		realtime_client.send_signal("repo", "REPO SIGNAL STAMP", 2)

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
	if collider != null and collider.has_meta("kind"):
		var kind := str(collider.get_meta("kind"))
		if kind.begins_with("menu:"):
			_activate_menu_by_id(kind.trim_prefix("menu:"))
			return
		if kind.begins_with("tray:"):
			var row_index: int = clampi(int(kind.trim_prefix("tray:")), 0, 2)
			tray_focus_index = row_index
			if _tray_mode() == "build" or _tray_mode() == "loadout":
				_mutate_active_tray_row(1)
			else:
				_show_signal_message(_menu_prompt_text(menu_focus_index))
				_refresh_all_ui()
			return
		_trigger_reaction(kind)
		if kind == "browser":
			realtime_client.send_signal("browser", "BROWSER HAND PULSE", 2)
		elif kind == "repo":
			realtime_client.send_signal("repo", "REPO SIGNAL STAMP", 2)
		elif kind == "care":
			realtime_client.send_signal("agent", "CLAWD BELL", 2)

func _step_menu_focus(direction: int) -> void:
	menu_focus_index = wrapi(menu_focus_index + direction, 0, WORKSHOP_MENU_IDS.size())
	signal_message_timer = 0.0
	_refresh_all_ui()
	if sfx_player:
		sfx_player.play_sfx("step", 0.35)

func _focus_tray_row(index: int) -> void:
	tray_focus_index = clamp(index, 0, 2)
	signal_message_timer = 0.0
	_refresh_all_ui()
	if sfx_player:
		sfx_player.play_sfx("select", 0.44)

func _activate_menu(index: int) -> void:
	menu_focus_index = clamp(index, 0, WORKSHOP_MENU_IDS.size() - 1)
	_activate_menu_by_id(str(WORKSHOP_MENU_IDS[menu_focus_index]))

func _activate_menu_by_id(menu_id: String) -> void:
	match menu_id:
		"home":
			_add_terminal_line("HOME / SPORE GARDEN")
			get_tree().change_scene_to_file(GARDEN_SCENE_PATH)
		"build":
			_trigger_reaction("build")
			_add_terminal_line("BUILD / SHELL READY")
		"loadout":
			_trigger_reaction("loadout")
			_add_terminal_line("LOADOUT / SLOTS READY")
		"browser":
			_trigger_reaction("browser")
			_add_terminal_line("BROWSER / HAND READY")
			realtime_client.send_signal("browser", "BROWSER HAND PULSE", 2)
			_request_setup_state()
		_:
			pass
	_refresh_all_ui()

func _mutate_active_tray_row(direction: int) -> void:
	match _tray_mode():
		"build":
			_mutate_build_row(tray_focus_index, direction)
		"loadout":
			_toggle_loadout_row(tray_focus_index)
		"browser":
			_request_setup_state()
			_show_signal_message("CHECK / HAND")
			if sfx_player:
				sfx_player.play_sfx("step", 0.4)

func _mutate_build_row(row_index: int, direction: int) -> void:
	var next_bot := workshop_bot.duplicate(true)
	if row_index == 0:
		var body_options := _body_options()
		build_body_index = wrapi(build_body_index + direction, 0, body_options.size())
		var body_option: Dictionary = body_options[build_body_index]
		next_bot = BotCatalog.build_identity_change(workshop_bot, "body", body_option.get("id", "orb"))
		_add_terminal_line("BUILD / BODY %s" % BotCatalog.body_label(str(next_bot.get("body", "orb"))))
	elif row_index == 1:
		var color_options := _color_options()
		build_color_index = wrapi(build_color_index + direction, 0, color_options.size())
		var color_id := str(color_options[build_color_index])
		next_bot = BotCatalog.build_identity_change(workshop_bot, "color", color_id)
		_add_terminal_line("BUILD / PIGMENT %s" % BotCatalog.pigment_label(color_id))
	else:
		var eye_options := _eye_options()
		build_eye_index = wrapi(build_eye_index + direction, 0, eye_options.size())
		var eye_option: Dictionary = eye_options[build_eye_index]
		next_bot = BotCatalog.build_identity_change(workshop_bot, "eye", eye_option.get("id", "glow"))
		_add_terminal_line("BUILD / EYE %s" % BotCatalog.eye_label(str(next_bot.get("eye", "glow"))))
	workshop_bot = BotCatalog.normalize_bot_identity(next_bot)
	_trigger_reaction("build")
	_queue_bot_save()
	_refresh_all_ui()

func _toggle_loadout_row(row_index: int) -> void:
	var slot_id := str(BotCatalog.slot_order()[clamp(row_index, 0, 4)])
	var equipped := BotCatalog.equipped_skill_for_slot(workshop_bot, slot_id) != ""
	workshop_bot = BotCatalog.set_slot_equipped(workshop_bot, slot_id, not equipped)
	_add_terminal_line("LOADOUT / %s %s" % [BotCatalog.slot_label(slot_id), "STOWED" if equipped else "FITTED"])
	_trigger_reaction("loadout")
	_queue_bot_save()
	_refresh_all_ui()

func _show_signal_message(text: String) -> void:
	signal_message_timer = 1.45
	if signal_label:
		signal_label.text = text

func _sync_signal_prompt() -> void:
	if signal_message_timer > 0.0:
		return
	if signal_label:
		signal_label.text = _menu_prompt_text(menu_focus_index)

func _menu_prompt_text(index: int) -> String:
	var clamped_index: int = clampi(index, 0, WORKSHOP_MENU_IDS.size() - 1)
	match str(WORKSHOP_MENU_IDS[clamped_index]):
		"home":
			return "GO / GARDEN"
		"build":
			match tray_focus_index:
				0:
					return "CYCLE / BODY"
				1:
					return "CYCLE / PIGMENT"
				_:
					return "CYCLE / EYE"
		"loadout":
			var slot_id := str(BotCatalog.slot_order()[tray_focus_index])
			var equipped := BotCatalog.equipped_skill_for_slot(workshop_bot, slot_id) != ""
			return "%s / %s" % ["STOW" if equipped else "FIT", BotCatalog.slot_label(slot_id)]
		"browser":
			return "CHECK / HAND"
		_:
			return "WORKSHOP / READY"

func _tray_mode() -> String:
	return str(WORKSHOP_MENU_IDS[clamp(menu_focus_index, 0, WORKSHOP_MENU_IDS.size() - 1)])

func _setup_key_ready() -> bool:
	if setup_state_error != "":
		return false
	var key_state = setup_state.get("key", {})
	return typeof(key_state) == TYPE_DICTIONARY and str(key_state.get("status", "")) == "ready"

func _setup_browser_status() -> String:
	if not setup_state_loaded and setup_state_error == "":
		return "wait"
	if setup_state_error != "":
		return "offline"
	var browser_state = setup_state.get("browser", {})
	if typeof(browser_state) != TYPE_DICTIONARY:
		return "unpaired"
	return str(browser_state.get("status", "unpaired"))

func _parse_json_dictionary(body: PackedByteArray) -> Dictionary:
	var parsed = JSON.parse_string(body.get_string_from_utf8())
	if typeof(parsed) != TYPE_DICTIONARY:
		return {}
	return parsed

func _add_terminal_line(line: String) -> void:
	if terminal:
		terminal.append_text("[color=#7fd8ff]>[/color] %s\n" % line)
		terminal.scroll_to_line(max(0, terminal.get_line_count() - 1))

func _add_crt_pass(root: Control) -> void:
	var overlay := ColorRect.new()
	overlay.name = "CRTPixelPass"
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	var shader := load("res://shaders/crt_pixel_pass.gdshader")
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("scanline_strength", 0.07)
	material.set_shader_parameter("dither_strength", 0.025)
	material.set_shader_parameter("low_res_scale", 2.0)
	material.set_shader_parameter("vignette_strength", 0.07)
	overlay.material = material
	root.add_child(overlay)

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

func _texture_material(asset_id: String) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color.WHITE
	if clay_textures.has(asset_id):
		material.albedo_texture = clay_textures[asset_id]
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	material.roughness = 0.92
	return material

func _load_png_image(path: String) -> Image:
	var image := Image.new()
	var error := image.load(path)
	if error != OK:
		return null
	return image

func _material(color: Color, asset_id: String = "") -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	if asset_id != "" and clay_textures.has(asset_id):
		material.albedo_texture = clay_textures[asset_id]
		material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	material.roughness = 0.92
	return material
