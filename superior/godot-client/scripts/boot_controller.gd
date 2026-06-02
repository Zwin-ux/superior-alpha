extends Control

const FACTORY_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-clay-factory-atlas.json"
const BOOT_DURATION := 2.65
const SHOWCASE_BOOT_DURATION := 2.2

var elapsed := 0.0
var factory_atlas: Texture2D
var factory_image: Image
var factory_textures: Dictionary = {}
var seed_sprite: TextureRect
var wordmark_sprite: TextureRect
var pulse: ColorRect
var pips: Array[TextureRect] = []
var lamp_wash: ColorRect
var sound_player: AudioStreamPlayer
var sound_playback: AudioStreamGeneratorPlayback
var sound_cursor := 0.0

func _ready() -> void:
	factory_image = _load_png_image("res://assets/clay/superior-clay-factory-atlas.png")
	if factory_image:
		factory_atlas = ImageTexture.create_from_image(factory_image)
	_load_factory_manifest()
	_build_screen()
	_build_robot_wakeup_audio()

func _process(delta: float) -> void:
	elapsed += delta
	_update_boot_animation()
	if elapsed > _boot_duration():
		get_tree().change_scene_to_file(_next_scene())

func _next_scene() -> String:
	if OS.get_environment("SUPERIOR_SHOWCASE") == "1":
		return "res://scenes/Onboarding.tscn"
	if OS.get_environment("SUPERIOR_FORCE_WORKSHOP") == "1":
		return "res://scenes/ClayWorkshop.tscn"
	if OS.get_environment("SUPERIOR_FORCE_ONBOARDING") == "1":
		return "res://scenes/Onboarding.tscn"
	if FileAccess.file_exists("user://superior-setup-complete.flag"):
		return "res://scenes/ClayWorkshop.tscn"
	return "res://scenes/Onboarding.tscn"

func _boot_duration() -> float:
	if OS.get_environment("SUPERIOR_SHOWCASE") == "1":
		return SHOWCASE_BOOT_DURATION
	return BOOT_DURATION

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
	seed_sprite.position = Vector2(584, 244)
	seed_sprite.size = Vector2(112, 112)
	seed_sprite.pivot_offset = Vector2(56, 56)
	add_child(seed_sprite)

	wordmark_sprite = TextureRect.new()
	wordmark_sprite.name = "BootWordmark"
	wordmark_sprite.texture = _factory_texture("boot.wordmark")
	wordmark_sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	wordmark_sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	wordmark_sprite.position = Vector2(448, 324)
	wordmark_sprite.size = Vector2(384, 108)
	wordmark_sprite.pivot_offset = Vector2(192, 54)
	wordmark_sprite.modulate.a = 0.0
	add_child(wordmark_sprite)

	for index in range(3):
		var pip := TextureRect.new()
		pip.name = "BootProgressPip%s" % index
		pip.texture = _factory_texture("boot.progress-pip")
		pip.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		pip.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		pip.position = Vector2(584 + index * 44, 462)
		pip.size = Vector2(28, 18)
		pip.modulate.a = 0.12
		add_child(pip)
		pips.append(pip)

func _update_boot_animation() -> void:
	var showcase := OS.get_environment("SUPERIOR_SHOWCASE") == "1"
	var boot_progress: float = clamp(elapsed / _boot_duration(), 0.0, 1.0)
	var beat: float = abs(sin(elapsed * 4.8))
	pulse.color = Color(0.24, 0.31, 0.30, 0.035 + beat * 0.035)
	_fill_robot_wakeup_audio()

	if seed_sprite:
		var seed_alpha: float = smoothstep(0.05 if showcase else 0.08, 0.20 if showcase else 0.28, elapsed) * (1.0 - smoothstep(1.04 if showcase else 1.35, 1.52 if showcase else 1.82, elapsed))
		var snap: float = sin(min(elapsed / 0.72, 1.0) * PI)
		seed_sprite.modulate.a = seed_alpha
		seed_sprite.rotation = sin(elapsed * 4.2) * 0.055 + snap * 0.09
		var scale: float = (0.72 if showcase else 0.62) + smoothstep(0.10 if showcase else 0.12, 0.78 if showcase else 0.86, elapsed) * (0.42 if showcase else 0.34) + snap * 0.08
		seed_sprite.scale = Vector2(scale, scale)

	if wordmark_sprite:
		var word_start := 0.62 if showcase else 0.92
		var word_end := 1.02 if showcase else 1.38
		wordmark_sprite.modulate.a = smoothstep(word_start, word_end, elapsed)
		var mark_scale: float = 0.98 + sin(clamp((elapsed - word_start) / max(0.1, word_end - word_start), 0.0, 1.0) * PI) * 0.018
		wordmark_sprite.scale = Vector2(mark_scale, mark_scale)

	for index in range(pips.size()):
		var pip := pips[index]
		var threshold := 0.22 + float(index) * 0.24
		pip.modulate.a = 1.0 if boot_progress > threshold else 0.18
		pip.scale = Vector2.ONE * (1.12 if boot_progress > threshold and boot_progress < threshold + 0.11 else 1.0)

	if lamp_wash:
		var reveal: float = smoothstep(_boot_duration() - 0.42, _boot_duration() - 0.08, elapsed)
		lamp_wash.color = Color(1.0, 0.72, 0.31, reveal * 0.12)

func _build_robot_wakeup_audio() -> void:
	var stream := AudioStreamGenerator.new()
	stream.mix_rate = 22050.0
	stream.buffer_length = 0.12
	sound_player = AudioStreamPlayer.new()
	sound_player.stream = stream
	sound_player.volume_db = -12.0
	add_child(sound_player)
	sound_player.play()
	sound_playback = sound_player.get_stream_playback()

func _fill_robot_wakeup_audio() -> void:
	if not sound_playback:
		return
	var frames_available := sound_playback.get_frames_available()
	for index in range(frames_available):
		var sample := _robot_wakeup_sample(sound_cursor)
		sound_playback.push_frame(Vector2(sample, sample))
		sound_cursor += 1.0 / 22050.0

func _robot_wakeup_sample(time: float) -> float:
	var sample := 0.0
	sample += _tone_burst(time, 0.24, 520.0, 0.08, 0.11)
	sample += _tone_burst(time, 0.68, 700.0, 0.07, 0.1)
	sample += _tone_burst(time, 1.14, 880.0, 0.14, 0.08)
	return clamp(sample, -0.16, 0.16)

func _tone_burst(time: float, start: float, frequency: float, duration: float, gain: float) -> float:
	if time < start or time > start + duration:
		return 0.0
	var t := time - start
	var envelope := sin((t / duration) * PI)
	var warble := sin(t * 38.0) * 0.08
	return sin((t * frequency + warble) * TAU) * envelope * gain

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
