extends Node3D
class_name SignalRoom

var realtime_client := preload("res://scripts/realtime_client.gd").new()
var terminal: RichTextLabel
var status_label: Label
var mode_label: Label
var stats_label: Label
var signal_label: Label
var avatar: MeshInstance3D
var signal_light: OmniLight3D
var pulse := 0.0
var latest_intensity := 1

func _ready() -> void:
	_build_room()
	_build_hud()
	add_child(realtime_client)
	realtime_client.message_received.connect(_on_realtime_message)
	realtime_client.server_status_changed.connect(_on_server_status_changed)
	realtime_client.connect_to_server("ws://127.0.0.1:7357/socket")
	_add_terminal_line("ROOM / WAITING FOR SERVER")

func _process(delta: float) -> void:
	pulse += delta
	if avatar:
		avatar.rotation.y = sin(pulse * 0.8) * 0.08
		avatar.position.y = 0.8 + sin(pulse * 1.4) * 0.035
	if signal_light:
		signal_light.light_energy = 0.68 + float(latest_intensity) * 0.2 + sin(pulse * 3.0) * 0.18
	if stats_label:
		var cpu := 27 + int(abs(sin(pulse * 1.7)) * 36.0)
		var sync := 42 + int(abs(cos(pulse * 1.2)) * 51.0)
		var heat := 13 + int(abs(sin(pulse * 0.9)) * 18.0)
		stats_label.text = "CPU %02d%%  SYNC %02d%%  HEAT %02dC  BUF %03d" % [cpu, sync, heat, 128 + int(abs(sin(pulse * 2.1)) * 384.0)]

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_1:
			realtime_client.send_signal("browser", "BROWSER HAND CHECK", 1)
		if event.keycode == KEY_2:
			realtime_client.send_signal("repo", "REPO SIGNAL FOUND", 2)
		if event.keycode == KEY_3:
			realtime_client.send_signal("agent", "AVATAR CORE SNAP", 1)

func _build_room() -> void:
	var camera := Camera3D.new()
	camera.position = Vector3(0, 4.0, 7.2)
	camera.rotation_degrees = Vector3(-29, 0, 0)
	add_child(camera)

	var world_light := DirectionalLight3D.new()
	world_light.rotation_degrees = Vector3(-50, 32, 0)
	world_light.light_energy = 1.25
	add_child(world_light)

	signal_light = OmniLight3D.new()
	signal_light.position = Vector3(0, 2.7, 0.8)
	signal_light.light_color = Color("#7fd8ff")
	add_child(signal_light)

	_add_box("Floor", Vector3(9.0, 0.22, 6.2), Vector3(0, -0.12, 0), Color("#2d2834"))
	_add_box("BackWall", Vector3(9.0, 4.2, 0.22), Vector3(0, 2.0, -3.0), Color("#143241"))
	_add_box("LeftConsole", Vector3(1.35, 1.9, 2.2), Vector3(-3.25, 0.95, -0.9), Color("#60454e"))
	_add_box("RightConsole", Vector3(1.35, 1.9, 2.2), Vector3(3.25, 0.95, -0.9), Color("#60454e"))
	_add_box("TerminalBlock", Vector3(4.8, 0.42, 1.45), Vector3(0, 0.34, -1.2), Color("#201822"))
	_add_box("BackMonitor", Vector3(3.8, 1.2, 0.16), Vector3(0, 2.12, -2.84), Color("#071116"))
	_add_box("BackMonitorGlow", Vector3(3.4, 0.86, 0.12), Vector3(0, 2.12, -2.72), Color("#123d4b"))
	_add_box("SignalAntennaLeft", Vector3(0.12, 1.6, 0.12), Vector3(-1.25, 1.05, -1.02), Color("#7f6a52"))
	_add_box("SignalAntennaRight", Vector3(0.12, 1.6, 0.12), Vector3(1.25, 1.05, -1.02), Color("#7f6a52"))

	for step in range(7):
		var z := -2.45 + float(step) * 0.72
		_add_box("FloorTraceL%s" % step, Vector3(0.08, 0.03, 0.42), Vector3(-1.45, 0.03, z), Color("#557484"))
		_add_box("FloorTraceR%s" % step, Vector3(0.08, 0.03, 0.42), Vector3(1.45, 0.03, z), Color("#557484"))

	avatar = MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.82
	sphere.height = 1.62
	avatar.mesh = sphere
	avatar.position = Vector3(0, 0.8, 0.2)
	avatar.material_override = _material(Color("#a88bc0"))
	add_child(avatar)

	_add_box("EyeLeft", Vector3(0.13, 0.13, 0.06), Vector3(-0.28, 0.92, 0.92), Color("#dff8ff"))
	_add_box("EyeRight", Vector3(0.13, 0.13, 0.06), Vector3(0.28, 0.92, 0.92), Color("#dff8ff"))
	_add_box("Badge", Vector3(0.28, 0.42, 0.08), Vector3(0.75, 0.95, 0.58), Color("#ead6b4"))
	_add_box("XRayRing", Vector3(0.08, 0.36, 0.08), Vector3(-0.82, 0.9, 0.35), Color("#d4aa52"))

func _build_hud() -> void:
	var hud := CanvasLayer.new()
	add_child(hud)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.add_child(root)

	var top_bar := PanelContainer.new()
	top_bar.position = Vector2(18, 16)
	top_bar.custom_minimum_size = Vector2(830, 78)
	root.add_child(top_bar)

	var top_row := HBoxContainer.new()
	top_row.add_theme_constant_override("separation", 22)
	top_bar.add_child(top_row)

	var title := Label.new()
	title.text = "SUPERIOR ."
	title.add_theme_font_size_override("font_size", 28)
	top_row.add_child(title)

	status_label = Label.new()
	status_label.text = "SERVER / CONNECTING"
	top_row.add_child(status_label)

	mode_label = Label.new()
	mode_label.text = "MODE / BOOT"
	top_row.add_child(mode_label)

	stats_label = Label.new()
	stats_label.text = "CPU 00%  SYNC 00%  HEAT 00C  BUF 000"
	top_row.add_child(stats_label)

	var terminal_panel := PanelContainer.new()
	terminal_panel.position = Vector2(18, 444)
	terminal_panel.custom_minimum_size = Vector2(720, 238)
	root.add_child(terminal_panel)

	terminal = RichTextLabel.new()
	terminal.custom_minimum_size = Vector2(690, 206)
	terminal.bbcode_enabled = true
	terminal.scroll_active = false
	terminal.add_theme_font_size_override("normal_font_size", 16)
	terminal_panel.add_child(terminal)

	var hint := Label.new()
	hint.position = Vector2(770, 628)
	hint.text = "1 BROWSER  2 REPO  3 AVATAR"
	hint.add_theme_font_size_override("font_size", 16)
	root.add_child(hint)

	signal_label = Label.new()
	signal_label.position = Vector2(770, 584)
	signal_label.text = "LAST SIGNAL / MOCK FEED ARMING"
	signal_label.add_theme_font_size_override("font_size", 16)
	root.add_child(signal_label)

	_add_crt_pass(root)

func _on_server_status_changed(status: String) -> void:
	if status_label:
		status_label.text = "SERVER / %s" % status.to_upper()

func _on_realtime_message(message: Dictionary) -> void:
	var message_type := str(message.get("type", "message")).to_upper()
	if message.has("state"):
		var state: Dictionary = message["state"]
		mode_label.text = "MODE / %s" % str(state.get("mode", "idle")).to_upper()
		if state.has("room"):
			var room: Dictionary = state["room"]
			if room.has("terminalLines"):
				terminal.clear()
				for line in room["terminalLines"]:
					_add_terminal_line(str(line))
				return

	if message.has("event"):
		var event: Dictionary = message["event"]
		latest_intensity = int(event.get("intensity", 1))
		var label := "%s / %s" % [str(event.get("kind", "signal")).to_upper(), str(event.get("label", "Signal"))]
		if bool(message.get("mock", false)):
			label = "MOCK " + label
		if signal_label:
			signal_label.text = "LAST SIGNAL / %s" % label
		_add_terminal_line(label)
	else:
		_add_terminal_line("%s / PATCH RECEIVED" % message_type)

func _add_terminal_line(line: String) -> void:
	if terminal:
		terminal.append_text("[color=#7fd8ff]>[/color] %s\n" % line)

func _add_crt_pass(root: Control) -> void:
	var overlay := ColorRect.new()
	overlay.name = "CRTPixelPass"
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	var shader := load("res://shaders/crt_pixel_pass.gdshader")
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("scanline_strength", 0.34)
	material.set_shader_parameter("dither_strength", 0.16)
	material.set_shader_parameter("low_res_scale", 3.0)
	material.set_shader_parameter("vignette_strength", 0.28)
	overlay.material = material
	root.add_child(overlay)

func _add_box(name: String, size: Vector3, position: Vector3, color: Color) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	instance.name = name
	instance.mesh = mesh
	instance.position = position
	instance.material_override = _material(color)
	add_child(instance)
	return instance

func _material(color: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 0.82
	return material
