extends Node3D
class_name ClayWorkshop

const SFX_PLAYER := preload("res://scripts/sfx_player.gd")
const CLAY_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-clay-factory-atlas.json"

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
var badge_part: MeshInstance3D
var side_part: MeshInstance3D
var lens_part: MeshInstance3D
var lamp_light: OmniLight3D
var tray_light: OmniLight3D
var workshop_menu_slabs: Array[MeshInstance3D] = []
var workshop_menu_lights: Array[MeshInstance3D] = []
var workshop_tray_slots: Array[MeshInstance3D] = []
var workshop_tray_lights: Array[MeshInstance3D] = []
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
var menu_focus_index := 0

func _ready() -> void:
	showcase_mode = OS.get_environment("SUPERIOR_SHOWCASE") == "1"
	clay_image = _load_png_image("res://assets/clay/superior-clay-factory-atlas.png")
	if clay_image:
		clay_atlas = ImageTexture.create_from_image(clay_image)
	_load_clay_asset_manifest()
	_build_room()
	_build_hud()
	_build_sfx()
	add_child(realtime_client)
	realtime_client.message_received.connect(_on_realtime_message)
	realtime_client.server_status_changed.connect(_on_server_status_changed)
	realtime_client.connect_to_server("ws://127.0.0.1:7357/socket")
	_add_terminal_line("WORKSHOP / LAMP READY")
	sfx_player.play_sfx("success", 0.45)

func _process(delta: float) -> void:
	pulse += delta
	if reaction_timer > 0.0:
		reaction_timer = max(0.0, reaction_timer - delta)
	_update_video_proof_reactions()
	_update_bot_motion()
	_update_lights()
	_update_stats()

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_handle_scene_click(event.position)
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_1:
			_trigger_reaction("browser")
			realtime_client.send_signal("browser", "BROWSER HAND CHECK", 2)
		if event.keycode == KEY_2:
			_trigger_reaction("repo")
			realtime_client.send_signal("repo", "REPO SIGNAL STAMP", 2)
		if event.keycode == KEY_3:
			_trigger_reaction("agent")
			realtime_client.send_signal("agent", "CLAWD SNAP", 3)

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
	_build_bench()
	_build_clawd()
	_build_status_pills()
	_build_props()

func _build_left_rail() -> void:
	_add_panel("LauncherRail", "scene.left-rail", Vector2(1.5, 2.25), Vector3(-3.06, 1.58, -0.2))
	var labels := ["HOME", "BUILD", "LOADOUT", "BROWSER"]
	for index in range(labels.size()):
		var y := 2.28 - float(index) * 0.44
		var slab := _add_panel("MenuSlab%s" % index, "scene.menu-slab.default", Vector2(1.1, 0.38), Vector3(-3.06, y, 0.06))
		var light := _add_sphere(self, "MenuLight%s" % index, 0.035, Vector3(-3.52, y - 0.01, 0.22), Color("#3a3128"))
		workshop_menu_slabs.append(slab)
		workshop_menu_lights.append(light)
		_add_world_label(labels[index], Vector3(-3.0, y - 0.025, 0.16), 17, Color("#23170f"))
	_add_sphere(self, "TinyOptionsBead", 0.055, Vector3(-3.47, 0.54, 0.18), Color("#5b4631"))
	_add_sphere(self, "TinyQuitBead", 0.055, Vector3(-3.2, 0.54, 0.18), Color("#8d4b3d"))

func _build_parts_tray() -> void:
	_add_panel("PartsTray", "scene.right-tray", Vector2(1.68, 2.16), Vector3(2.56, 1.64, -0.12))
	_add_world_label("PARTS RACK", Vector3(2.56, 2.52, 0.3), 19, Color("#23170f"))
	var rows := [
		["EYE", "X-RAY"],
		["SIDE", "REPO"],
		["BADGE", "STAMP"]
	]
	for index in range(rows.size()):
		var y := 2.14 - float(index) * 0.48
		var asset_id := "scene.tray-slot.equipped"
		var slot := _add_panel("TraySlot%s" % index, asset_id, Vector2(1.34, 0.36), Vector3(2.58, y, 0.16))
		var light := _add_sphere(self, "TrayLight%s" % index, 0.034, Vector3(2.05, y - 0.02, 0.32), Color("#72d968"))
		workshop_tray_slots.append(slot)
		workshop_tray_lights.append(light)
		_add_world_label(rows[index][0], Vector3(2.46, y - 0.02, 0.28), 16, Color("#23170f"))
		_add_world_label(rows[index][1], Vector3(2.89, y - 0.02, 0.28), 12, Color("#4c3524"))

func _build_bench() -> void:
	_add_panel("PedestalPlate", "scene.pedestal", Vector2(2.58, 1.27), Vector3(0, 0.42, 0.14))
	_add_box(self, "BenchShadow", Vector3(2.65, 0.035, 0.42), Vector3(0, 0.13, 0.28), Color("#2c1d17"))
	for step in range(6):
		var x := -0.98 + float(step) * 0.39
		var trace := _add_box(self, "BenchTrace%s" % step, Vector3(0.18, 0.035, 0.04), Vector3(x, 0.68, 0.38), Color("#385761"))
		trace_nodes.append(trace)

func _build_clawd() -> void:
	bot_rig = Node3D.new()
	bot_rig.name = "ClawdGremlin"
	bot_rig.position = Vector3(0, 0.78, 0.58)
	add_child(bot_rig)

	bot_body = _add_panel_to(bot_rig, "ClawdBody", "bot.clawd.body", Vector2(1.74, 1.74), Vector3(0.0, 0.48, 0.16))
	eye_panel = _add_panel_to(bot_rig, "PixelEyes", "bot.clawd.eye.pixel", Vector2(0.82, 0.42), Vector3(0.02, 0.62, 0.34))
	lens_part = _add_panel_to(bot_rig, "XRayLens", "bot.clawd.skill.eye", Vector2(0.43, 0.43), Vector3(-0.64, 0.56, 0.42))
	badge_part = _add_panel_to(bot_rig, "ExplainBadge", "bot.clawd.skill.badge", Vector2(0.38, 0.38), Vector3(0.72, 0.56, 0.42))
	side_part = _add_panel_to(bot_rig, "RepoSidePart", "bot.clawd.skill.side", Vector2(0.42, 0.42), Vector3(-0.84, 0.25, 0.28))

func _build_status_pills() -> void:
	for index in range(3):
		var x := -3.72 + float(index) * 1.1
		_add_panel("StatusPill%s" % index, "scene.status-pill", Vector2(1.0, 0.34), Vector3(x, -0.34, 1.18))
	_add_world_label("DAEMON", Vector3(-3.62, -0.35, 1.31), 15, Color("#d7c999"))
	_add_world_label("OPENAI", Vector3(-2.52, -0.35, 1.31), 15, Color("#d7c999"))
	_add_world_label("BROWSER", Vector3(-1.42, -0.35, 1.31), 15, Color("#d7c999"))
	_add_panel("BotCard", "scene.bottom-card", Vector2(2.4, 0.78), Vector3(0.0, -0.42, 1.12))
	_add_world_label("SAVED SPORE", Vector3(-0.56, -0.22, 1.31), 12, Color("#23170f"))
	_add_world_label("CLAWD", Vector3(-0.50, -0.42, 1.32), 28, Color("#23170f"))
	_add_world_label("GREMLIN / MOSS / PIXEL", Vector3(0.36, -0.53, 1.31), 10, Color("#4c3524"))

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
	status_label.text = "SERVER / CONNECTING"
	status_label.add_theme_font_size_override("font_size", 12)
	top_row.add_child(status_label)

	stats_label = Label.new()
	stats_label.text = "SYNC 00  HEAT 00"
	stats_label.add_theme_font_size_override("font_size", 12)
	top_row.add_child(stats_label)

	var terminal_panel := PanelContainer.new()
	terminal_panel.position = Vector2(24, 622)
	terminal_panel.custom_minimum_size = Vector2(370, 74)
	root.add_child(terminal_panel)

	terminal = RichTextLabel.new()
	terminal.custom_minimum_size = Vector2(346, 48)
	terminal.bbcode_enabled = true
	terminal.scroll_active = false
	terminal.add_theme_font_size_override("normal_font_size", 13)
	terminal_panel.add_child(terminal)

	signal_label = Label.new()
	signal_label.position = Vector2(782, 620)
	signal_label.text = "CRANK   STAMP   BELL" if showcase_mode else "CLICK CRANK / STAMP / BELL"
	signal_label.add_theme_font_size_override("font_size", 18)
	root.add_child(signal_label)

	_add_crt_pass(root)

func _build_sfx() -> void:
	sfx_player = SFX_PLAYER.new()
	add_child(sfx_player)

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

	if eye_panel:
		var blink := reaction_kind == "browser" and reaction_timer > 0.26 and int(reaction_timer * 20.0) % 2 == 0
		eye_panel.scale.y = 0.18 if blink else 1.0
	if lens_part:
		lens_part.scale = Vector3.ONE * (1.0 + (sin(reaction_timer * 14.0) * 0.11 if reaction_kind == "browser" else 0.0))
	if badge_part:
		badge_part.scale = Vector3.ONE * (1.0 + (sin(reaction_timer * 12.0) * 0.13 if reaction_kind == "agent" else 0.0))
	if side_part:
		side_part.scale = Vector3.ONE * (1.0 + (sin(reaction_timer * 10.0) * 0.12 if reaction_kind == "repo" else 0.0))

func _update_lights() -> void:
	if lamp_light:
		lamp_light.light_energy = 2.05 + sin(pulse * 2.2) * 0.22 + (reaction_timer * 1.5 if reaction_kind == "agent" else 0.0)
	if tray_light:
		tray_light.light_energy = 0.2 + (reaction_timer * 2.3 if reaction_kind == "browser" else 0.0)
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
			slab.scale = Vector3(1.06, 0.92, 1.0) if active else Vector3.ONE
		if light and light.material_override:
			light.material_override.albedo_color = Color("#ffd36b").lerp(Color("#72d968"), focus_pulse) if active else Color("#3a3128")
			light.scale = Vector3.ONE * (1.25 if active else 1.0)

	for index in range(workshop_tray_slots.size()):
		var reacting := (reaction_kind == "browser" and index == 0) or (reaction_kind == "repo" and index == 1) or ((reaction_kind == "agent" or reaction_kind == "care") and index == 2)
		var slot := workshop_tray_slots[index]
		var light := workshop_tray_lights[index]
		if slot:
			slot.scale = Vector3(1.06, 1.06, 1.0) if reacting and reaction_timer > 0.0 else Vector3.ONE
		if light and light.material_override:
			light.material_override.albedo_color = Color("#8fe8ff") if reacting and reaction_timer > 0.0 else Color("#72d968")

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

func _update_stats() -> void:
	if stats_label:
		var sync := 48 + int(abs(sin(pulse * 1.2)) * 44.0)
		var heat := 18 + int(abs(sin(pulse * 0.8)) * 12.0)
		stats_label.text = "SYNC %02d  HEAT %02d" % [sync, heat]

func _on_server_status_changed(status: String) -> void:
	if status_label:
		var visible_status := "LOCAL" if showcase_mode and status == "mock" else status.to_upper()
		status_label.text = "SERVER / %s" % visible_status

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
		_trigger_reaction(kind)
		_add_terminal_line(label)
		if signal_label:
			signal_label.text = "LAST / %s" % label
		return
	_add_terminal_line("%s / PATCH RECEIVED" % str(message.get("type", "message")).to_upper())

func _trigger_reaction(kind: String) -> void:
	reaction_kind = kind
	reaction_timer = 0.65
	match kind:
		"browser":
			menu_focus_index = 3
		"repo":
			menu_focus_index = 2
		"agent":
			menu_focus_index = 1
		"care":
			menu_focus_index = 0
		_:
			menu_focus_index = 0
	if not sfx_player:
		return
	match kind:
		"browser":
			sfx_player.play_sfx("browser_bind", 0.72)
		"repo":
			sfx_player.play_sfx("repo", 0.82)
		"agent":
			sfx_player.play_sfx("attach", 0.82)
		"care":
			sfx_player.play_sfx("play", 0.78)
		"system":
			sfx_player.play_sfx("step", 0.45)
		"market":
			sfx_player.play_sfx("signal", 0.5)
		_:
			sfx_player.play_sfx("signal", 0.55)

func _update_video_proof_reactions() -> void:
	if OS.get_environment("SUPERIOR_VIDEO_PROOF") != "1":
		return
	var beat_1 := 0.72 if showcase_mode else 1.1
	var beat_2 := 2.2 if showcase_mode else 3.1
	var beat_3 := 3.65 if showcase_mode else 5.1
	if video_reaction_step == 0 and pulse > beat_1:
		video_reaction_step = 1
		_trigger_reaction("browser")
		realtime_client.send_signal("browser", "BROWSER HAND PULSE", 2)
	if video_reaction_step == 1 and pulse > beat_2:
		video_reaction_step = 2
		_trigger_reaction("repo")
		realtime_client.send_signal("repo", "REPO SIGNAL STAMP", 2)
	if video_reaction_step == 2 and pulse > beat_3:
		video_reaction_step = 3
		_trigger_reaction("care")
		realtime_client.send_signal("agent", "CLAWD SNAP", 3)

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
	if collider and collider.has_meta("kind"):
		var kind := str(collider.get_meta("kind"))
		_trigger_reaction(kind)
		if kind == "browser":
			realtime_client.send_signal("browser", "BROWSER HAND PULSE", 2)
		elif kind == "repo":
			realtime_client.send_signal("repo", "REPO SIGNAL STAMP", 2)
		elif kind == "care":
			realtime_client.send_signal("agent", "CLAWD BELL", 2)

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

func _add_world_label(text: String, position: Vector3, size: int, color: Color) -> void:
	var label := Label3D.new()
	label.text = text
	label.position = position
	label.font_size = size
	label.modulate = color
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	add_child(label)

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
