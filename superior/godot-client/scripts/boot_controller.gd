extends Control

const FACTORY_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-clay-factory-atlas.json"

var elapsed := 0.0
var factory_atlas: Texture2D
var factory_image: Image
var factory_textures: Dictionary = {}
var seed_sprite: TextureRect
var wordmark_sprite: TextureRect
var booting_label: Label
var pulse: ColorRect
var pips: Array[TextureRect] = []
var lamp_wash: ColorRect

func _ready() -> void:
	factory_image = _load_png_image("res://assets/clay/superior-clay-factory-atlas.png")
	if factory_image:
		factory_atlas = ImageTexture.create_from_image(factory_image)
	_load_factory_manifest()
	_build_screen()

func _process(delta: float) -> void:
	elapsed += delta
	_update_boot_animation()
	if elapsed > 3.8:
		get_tree().change_scene_to_file(_next_scene())

func _next_scene() -> String:
	if OS.get_environment("SUPERIOR_FORCE_WORKSHOP") == "1":
		return "res://scenes/ClayWorkshop.tscn"
	if OS.get_environment("SUPERIOR_FORCE_ONBOARDING") == "1":
		return "res://scenes/Onboarding.tscn"
	if FileAccess.file_exists("user://superior-setup-complete.flag"):
		return "res://scenes/ClayWorkshop.tscn"
	return "res://scenes/Onboarding.tscn"

func _build_screen() -> void:
	var background := ColorRect.new()
	background.color = Color("#050504")
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	pulse = ColorRect.new()
	pulse.color = Color(0.45, 0.58, 0.54, 0.0)
	pulse.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(pulse)

	lamp_wash = ColorRect.new()
	lamp_wash.color = Color(1.0, 0.73, 0.34, 0.0)
	lamp_wash.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(lamp_wash)

	seed_sprite = TextureRect.new()
	seed_sprite.name = "BootSeed"
	seed_sprite.texture = _factory_texture("boot.seed")
	seed_sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	seed_sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	seed_sprite.position = Vector2(512, 220)
	seed_sprite.size = Vector2(256, 256)
	seed_sprite.pivot_offset = Vector2(128, 128)
	add_child(seed_sprite)

	wordmark_sprite = TextureRect.new()
	wordmark_sprite.name = "BootWordmark"
	wordmark_sprite.texture = _factory_texture("boot.wordmark")
	wordmark_sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	wordmark_sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	wordmark_sprite.position = Vector2(384, 212)
	wordmark_sprite.size = Vector2(512, 160)
	wordmark_sprite.modulate.a = 0.0
	add_child(wordmark_sprite)

	booting_label = Label.new()
	booting_label.text = "SUPERIOR BOOTING"
	booting_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	booting_label.position = Vector2(0, 440)
	booting_label.size = Vector2(1280, 34)
	booting_label.add_theme_font_size_override("font_size", 18)
	booting_label.add_theme_color_override("font_color", Color("#d7e9e4"))
	booting_label.modulate.a = 0.0
	add_child(booting_label)

	for index in range(5):
		var pip := TextureRect.new()
		pip.name = "BootProgressPip%s" % index
		pip.texture = _factory_texture("boot.progress-pip")
		pip.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		pip.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		pip.position = Vector2(514 + index * 52, 486)
		pip.size = Vector2(44, 28)
		pip.modulate.a = 0.16
		add_child(pip)
		pips.append(pip)

func _update_boot_animation() -> void:
	var boot_progress: float = clamp(elapsed / 3.25, 0.0, 1.0)
	var beat: float = abs(sin(elapsed * 7.5))
	pulse.color = Color(0.28, 0.42, 0.40, 0.06 + beat * 0.06)

	if seed_sprite:
		var seed_alpha: float = 1.0 - smoothstep(1.45, 2.15, elapsed)
		var snap: float = sin(min(elapsed / 1.25, 1.0) * PI)
		seed_sprite.modulate.a = seed_alpha
		seed_sprite.rotation = sin(elapsed * 5.2) * 0.18 + snap * 0.18
		var scale: float = 0.72 + smoothstep(0.2, 1.0, elapsed) * 0.42 + snap * 0.08
		seed_sprite.scale = Vector2(scale, scale)

	if wordmark_sprite:
		wordmark_sprite.modulate.a = smoothstep(1.65, 2.3, elapsed)
		var mark_scale: float = 0.96 + sin(clamp((elapsed - 1.65) / 0.65, 0.0, 1.0) * PI) * 0.05
		wordmark_sprite.scale = Vector2(mark_scale, mark_scale)

	if booting_label:
		booting_label.modulate.a = smoothstep(2.15, 2.65, elapsed)
		booting_label.position.y = 440 + sin(elapsed * 2.5) * 1.5

	for index in range(pips.size()):
		var pip := pips[index]
		var threshold := 0.24 + float(index) * 0.13
		pip.modulate.a = 1.0 if boot_progress > threshold else 0.18
		pip.scale = Vector2.ONE * (1.08 if boot_progress > threshold and boot_progress < threshold + 0.08 else 1.0)

	if lamp_wash:
		var reveal: float = smoothstep(3.1, 3.65, elapsed)
		lamp_wash.color = Color(1.0, 0.72, 0.31, reveal * 0.18)

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

func _factory_texture(asset_id: String) -> Texture2D:
	return factory_textures.get(asset_id, factory_atlas)

func _load_png_image(path: String) -> Image:
	var image := Image.new()
	var error := image.load(path)
	if error != OK:
		return null
	return image
