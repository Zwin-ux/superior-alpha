extends Node3D
class_name SporeGarden

const SFX_PLAYER := preload("res://scripts/sfx_player.gd")
const CLAY_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-clay-factory-atlas.json"

const RACES := [
	{
		"id": "builder",
		"label": "BUILDER RACE",
		"short": "BUILDER",
		"color": Color("#6f8d58"),
		"accent": Color("#d8a849"),
		"body": "bot.clawd.body",
		"line": "project work / tool snap"
	},
	{
		"id": "scout",
		"label": "SCOUT RACE",
		"short": "SCOUT",
		"color": Color("#6fa0b7"),
		"accent": Color("#8fe8ff"),
		"body": "bot.clawd.body",
		"line": "browser signals / lens sweep"
	},
	{
		"id": "sentinel",
		"label": "SENTINEL RACE",
		"short": "SENTINEL",
		"color": Color("#a95442"),
		"accent": Color("#ffe0a3"),
		"body": "bot.clawd.body",
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
var race_badge: MeshInstance3D
var skill_part: MeshInstance3D
var antenna_left: MeshInstance3D
var antenna_right: MeshInstance3D
var race_markers: Array[MeshInstance3D] = []
var race_labels: Array[Label3D] = []
var status_label: Label
var race_label: Label
var mood_label: Label
var action_label: Label
var equipped_label: Label
var selected_race_index := 0
var reaction_kind := ""
var reaction_timer := 0.0
var pulse := 0.0
var equipped := false
var video_step := 0
var showcase_mode := false
var sfx_player

func _ready() -> void:
	showcase_mode = OS.get_environment("SUPERIOR_SHOWCASE") == "1"
	clay_image = _load_png_image("res://assets/clay/superior-clay-factory-atlas.png")
	if clay_image:
		clay_atlas = ImageTexture.create_from_image(clay_image)
	_load_clay_asset_manifest()
	_build_garden()
	_build_hud()
	_build_sfx()
	_select_race(0)

func _process(delta: float) -> void:
	pulse += delta
	if reaction_timer > 0.0:
		reaction_timer = max(0.0, reaction_timer - delta)
	_update_motion()
	_update_video_proof()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_1:
			_trigger_reaction("play")
		if event.keycode == KEY_2:
			_equip_skill()
		if event.keycode == KEY_3:
			_trigger_reaction("signal")
		if event.keycode == KEY_Q:
			_select_race(max(0, selected_race_index - 1))
		if event.keycode == KEY_E:
			_select_race(min(RACES.size() - 1, selected_race_index + 1))
		if event.keycode == KEY_ENTER or event.keycode == KEY_SPACE:
			get_tree().change_scene_to_file("res://scenes/ClayWorkshop.tscn")

func _build_garden() -> void:
	camera = Camera3D.new()
	camera.position = Vector3(0.0, 2.46, 5.8)
	camera.rotation_degrees = Vector3(-14.0, 0.0, 0.0)
	camera.fov = 54.0
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
	_add_panel("GardenTable", "scene.table", Vector2(13.8, 1.28), Vector3(0, -0.95, 0.04))
	_add_box(self, "GardenSoil", Vector3(4.6, 0.28, 2.1), Vector3(0.0, -0.2, 0.58), Color("#69452f"))
	_add_panel("GardenLamp", "scene.lamp", Vector2(1.5, 1.08), Vector3(-0.08, 2.95, -1.54))
	_add_panel("GardenSign", "scene.menu-slab.default", Vector2(3.25, 0.58), Vector3(0.0, 2.36, -1.45))
	_add_world_label("SPORE GARDEN", Vector3(-0.74, 2.34, -0.94), 28, Color("#23170f"))
	_add_world_label("RACE HOME", Vector3(-0.31, 2.14, -0.94), 14, Color("#4c3524"))

	_build_race_stones()
	_build_spore()
	_build_garden_props()
	_build_gate()

func _build_race_stones() -> void:
	for index in range(RACES.size()):
		var race: Dictionary = RACES[index]
		var x := -1.52 + float(index) * 1.52
		var stone := _add_box(self, "RaceStone%s" % index, Vector3(0.9, 0.18, 0.54), Vector3(x, 0.02, 0.22), Color("#c5a879"))
		race_markers.append(stone)
		_add_sphere(self, "RaceHead%s" % index, 0.24, Vector3(x, 0.34, 0.2), race["color"])
		if index == 1:
			_add_sphere(self, "RaceLens%s" % index, 0.1, Vector3(x, 0.38, 0.42), Color("#8fe8ff"))
		if index == 2:
			_add_box(self, "RaceShield%s" % index, Vector3(0.24, 0.18, 0.08), Vector3(x + 0.18, 0.35, 0.41), Color("#ffe0a3"))
		var label := _add_world_label(str(race["short"]), Vector3(x - 0.32, -0.03, 0.55), 14, Color("#23170f"))
		race_labels.append(label)

func _build_spore() -> void:
	spore_rig = Node3D.new()
	spore_rig.name = "GardenSpore"
	spore_rig.position = Vector3(0.0, 0.47, 0.82)
	add_child(spore_rig)

	spore_body = _add_panel_to(spore_rig, "GardenSporeBody", "bot.clawd.body", Vector2(1.52, 1.52), Vector3(0.0, 0.42, 0.14))
	eye_panel = _add_panel_to(spore_rig, "GardenSporeEyes", "bot.clawd.eye.pixel", Vector2(0.72, 0.36), Vector3(0.0, 0.55, 0.35))
	race_badge = _add_box(spore_rig, "GardenRaceBadge", Vector3(0.24, 0.18, 0.08), Vector3(0.58, 0.55, 0.41), Color("#d8a849"))
	skill_part = _add_panel_to(spore_rig, "GardenSkillPart", "bot.clawd.skill.eye", Vector2(0.34, 0.34), Vector3(-0.58, 0.54, 0.42))
	skill_part.visible = false
	antenna_left = _add_box(spore_rig, "BuilderAntennaLeft", Vector3(0.07, 0.58, 0.07), Vector3(-0.28, 1.15, 0.18), Color("#42502f"))
	antenna_right = _add_box(spore_rig, "BuilderAntennaRight", Vector3(0.07, 0.42, 0.07), Vector3(0.23, 1.08, 0.18), Color("#42502f"))

func _build_garden_props() -> void:
	for index in range(8):
		var x := -2.18 + float(index) * 0.62
		var z := 0.0 + sin(float(index)) * 0.26
		_add_sphere(self, "ClayPebble%s" % index, 0.08 + float(index % 3) * 0.015, Vector3(x, -0.02, z + 0.78), Color("#8b6a4a"))
	_add_sphere(self, "GardenPlantPot", 0.22, Vector3(-2.55, -0.28, 0.72), Color("#6f7b58"))
	_add_box(self, "GardenLeafA", Vector3(0.08, 0.52, 0.08), Vector3(-2.58, 0.1, 0.72), Color("#456d43"))
	_add_box(self, "GardenLeafB", Vector3(0.08, 0.42, 0.08), Vector3(-2.42, 0.04, 0.73), Color("#4f7a48"))
	_add_box(self, "ToyTool", Vector3(0.16, 0.12, 0.72), Vector3(2.45, -0.22, 0.78), Color("#9a5b39"))
	_add_box(self, "ToyToolTip", Vector3(0.14, 0.07, 0.32), Vector3(2.74, -0.21, 0.78), Color("#8b8981"))

func _build_gate() -> void:
	_add_panel("WorkshopGatePlate", "scene.status-pill", Vector2(1.5, 0.42), Vector3(2.45, 0.42, 0.36))
	_add_world_label("ENTER WORKSHOP", Vector3(2.12, 0.41, 0.62), 14, Color("#d7c999"))

func _build_hud() -> void:
	var hud := CanvasLayer.new()
	add_child(hud)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.add_child(root)

	status_label = _add_hud_label(root, "SPORE GARDEN", Vector2(26, 20), Vector2(300, 30), 20, Color("#f8e6b2"))
	race_label = _add_hud_label(root, "RACE / BUILDER", Vector2(26, 54), Vector2(340, 26), 16, Color("#d7c999"))
	mood_label = _add_hud_label(root, "MOOD / CURIOUS", Vector2(26, 82), Vector2(360, 26), 16, Color("#d7c999"))
	equipped_label = _add_hud_label(root, "PART / EMPTY", Vector2(26, 110), Vector2(340, 26), 16, Color("#d7c999"))
	var action_text := "CARE   EQUIP   SIGNAL   WORKSHOP READY" if showcase_mode else "1 PLAY   2 EQUIP   3 SIGNAL   ENTER WORKSHOP"
	action_label = _add_hud_label(root, action_text, Vector2(716, 646), Vector2(520, 30), 16, Color("#f8e6b2"))
	_add_crt_pass(root)

func _build_sfx() -> void:
	sfx_player = SFX_PLAYER.new()
	add_child(sfx_player)

func _select_race(index: int) -> void:
	selected_race_index = clamp(index, 0, RACES.size() - 1)
	var race: Dictionary = RACES[selected_race_index]
	if spore_body and spore_body.material_override:
		spore_body.material_override.albedo_color = race["color"]
	if race_badge and race_badge.material_override:
		race_badge.material_override.albedo_color = race["accent"]
	if antenna_left:
		antenna_left.visible = race["id"] == "builder"
	if antenna_right:
		antenna_right.visible = race["id"] == "builder"
	for marker_index in range(race_markers.size()):
		var marker := race_markers[marker_index]
		var active := marker_index == selected_race_index
		marker.scale = Vector3(1.14, 1.14, 1.14) if active else Vector3.ONE
		if marker.material_override:
			marker.material_override.albedo_color = Color("#e0be72") if active else Color("#c5a879")
	if race_label:
		race_label.text = "RACE / %s" % str(race["short"])
	if mood_label:
		mood_label.text = "MOOD / %s" % str(race["line"]).to_upper()
	_trigger_reaction("race")

func _equip_skill() -> void:
	equipped = true
	if skill_part:
		skill_part.visible = true
	if equipped_label:
		equipped_label.text = "PART / X-RAY FITTED"
	_trigger_reaction("equip")

func _trigger_reaction(kind: String) -> void:
	reaction_kind = kind
	reaction_timer = 0.72
	if sfx_player:
		match kind:
			"play":
				sfx_player.play_sfx("play", 0.82)
			"equip":
				sfx_player.play_sfx("equip", 0.9)
			"signal":
				sfx_player.play_sfx("signal", 0.86)
			"race":
				sfx_player.play_sfx("select", 0.56)
	if mood_label:
		if kind == "play":
			mood_label.text = "MOOD / HAPPY HOP"
		elif kind == "equip":
			mood_label.text = "MOOD / PART SNAP"
		elif kind == "signal":
			mood_label.text = "MOOD / SIGNAL CAUGHT"
		elif kind == "race":
			mood_label.text = "MOOD / RACE SET"

func _update_motion() -> void:
	if not spore_rig:
		return
	var reaction := reaction_timer / 0.72
	var hop := 0.0
	var snap := 0.0
	if reaction_kind == "play":
		hop = sin(reaction * PI) * 0.42
	if reaction_kind == "equip":
		snap = sin(reaction * PI) * 0.14
	if reaction_kind == "signal":
		snap = sin(reaction * PI * 2.0) * 0.09
	spore_rig.position.y = 0.47 + sin(pulse * 1.35) * 0.025 + hop
	spore_rig.rotation.y = sin(pulse * 0.7) * 0.08 + (sin(reaction * PI) * 0.15 if reaction_kind == "signal" else 0.0)
	spore_rig.scale = Vector3(1.0 + snap, 1.0 - snap * 0.8, 1.0)
	if eye_panel:
		var blink := int(pulse * 2.0) % 7 == 0 or (reaction_kind == "play" and reaction_timer > 0.28)
		eye_panel.scale.y = 0.25 if blink else 1.0
	if skill_part and skill_part.visible:
		var pulse_scale := 1.0 + (sin(reaction_timer * 13.0) * 0.12 if reaction_kind == "equip" or reaction_kind == "signal" else 0.0)
		skill_part.scale = Vector3.ONE * pulse_scale

func _update_video_proof() -> void:
	if OS.get_environment("SUPERIOR_VIDEO_PROOF") != "1":
		return
	var beat_1 := 0.62 if showcase_mode else 0.65
	var beat_2 := 1.72 if showcase_mode else 2.0
	var beat_3 := 2.72 if showcase_mode else 3.25
	var beat_4 := 3.72 if showcase_mode else 4.45
	var beat_5 := 5.05 if showcase_mode else 6.05
	var beat_6 := 6.25 if showcase_mode else 7.75
	if video_step == 0 and pulse > beat_1:
		video_step = 1
		_select_race(0)
		_trigger_reaction("play")
	if video_step == 1 and pulse > beat_2:
		video_step = 2
		_select_race(1)
	if video_step == 2 and pulse > beat_3:
		video_step = 3
		_select_race(2)
	if video_step == 3 and pulse > beat_4:
		video_step = 4
		_select_race(0)
		_equip_skill()
	if video_step == 4 and pulse > beat_5:
		video_step = 5
		_trigger_reaction("signal")
	if video_step == 5 and pulse > beat_6:
		video_step = 6
		get_tree().change_scene_to_file("res://scenes/ClayWorkshop.tscn")

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
