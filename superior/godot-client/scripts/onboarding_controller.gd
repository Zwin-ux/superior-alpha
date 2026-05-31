extends Control
class_name OnboardingController

const STEPS := [
	{
		"id": "account",
		"title": "ACCOUNT",
		"primary": "EMAIL CODE",
		"detail": "operator@superior.local",
		"stamp": "CLOUD / MOCK VERIFIED"
	},
	{
		"id": "model",
		"title": "MODEL",
		"primary": "LOCAL OLLAMA",
		"detail": "OpenAI BYOK fitted as backup",
		"stamp": "MODEL / LOCAL FIRST"
	},
	{
		"id": "browser",
		"title": "BROWSER",
		"primary": "BROWSER HAND",
		"detail": "Chrome extension waits for pairing",
		"stamp": "HAND / READY"
	},
	{
		"id": "starter",
		"title": "STARTER",
		"primary": "CLAWD",
		"detail": "Moss Gremlin / Pixel Eye",
		"stamp": "SPORE / SELECTED"
	},
	{
		"id": "skills",
		"title": "SKILLS",
		"primary": "EYE + BADGE + SIDE",
		"detail": "X-Ray / Explain / Repo",
		"stamp": "PARTS / FITTED"
	},
	{
		"id": "save",
		"title": "SAVE",
		"primary": "SAVE SPORE",
		"detail": "profile + spore only",
		"stamp": "WORKSHOP / OPEN"
	}
]

var step_index := 0
var elapsed := 0.0
var auto_demo := false
var title_label: Label
var primary_label: Label
var detail_label: Label
var stamp_label: Label
var step_label: Label
var progress_fill: ColorRect
var bot_head: ColorRect
var skill_parts: Array[ColorRect] = []

func _ready() -> void:
	auto_demo = OS.get_environment("SUPERIOR_VIDEO_PROOF") == "1"
	_build_screen()
	_render_step()

func _process(delta: float) -> void:
	elapsed += delta
	_update_motion()
	if auto_demo and elapsed > 2.1:
		_advance()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ENTER or event.keycode == KEY_SPACE:
			_advance()
		if event.keycode == KEY_ESCAPE:
			get_tree().change_scene_to_file("res://scenes/ClayWorkshop.tscn")

func _advance() -> void:
	elapsed = 0.0
	if step_index < STEPS.size() - 1:
		step_index += 1
		_render_step()
		return

	_save_setup_complete()
	get_tree().change_scene_to_file("res://scenes/ClayWorkshop.tscn")

func _render_step() -> void:
	var step: Dictionary = STEPS[step_index]
	title_label.text = str(step["title"])
	primary_label.text = str(step["primary"])
	detail_label.text = str(step["detail"])
	stamp_label.text = str(step["stamp"])
	step_label.text = "%02d / %02d" % [step_index + 1, STEPS.size()]
	progress_fill.size = Vector2(420.0 * float(step_index + 1) / float(STEPS.size()), 7)

	for index in range(skill_parts.size()):
		skill_parts[index].visible = step_index >= 4 or index <= step_index - 1

func _build_screen() -> void:
	var background := ColorRect.new()
	background.color = Color("#0a0907")
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	var wall := ColorRect.new()
	wall.color = Color("#214f58")
	wall.position = Vector2(250, 92)
	wall.size = Vector2(780, 330)
	wall.custom_minimum_size = Vector2(780, 330)
	add_child(wall)

	var table := ColorRect.new()
	table.color = Color("#774632")
	table.position = Vector2(0, 438)
	table.size = Vector2(1280, 282)
	table.custom_minimum_size = Vector2(1280, 282)
	add_child(table)

	var left_panel := PanelContainer.new()
	left_panel.position = Vector2(82, 118)
	left_panel.size = Vector2(250, 420)
	left_panel.custom_minimum_size = Vector2(250, 420)
	add_child(left_panel)

	var left_box := VBoxContainer.new()
	left_box.add_theme_constant_override("separation", 18)
	left_panel.add_child(left_box)

	step_label = Label.new()
	step_label.text = "01 / 06"
	step_label.add_theme_font_size_override("font_size", 18)
	left_box.add_child(step_label)

	title_label = Label.new()
	title_label.text = "ACCOUNT"
	title_label.add_theme_font_size_override("font_size", 34)
	left_box.add_child(title_label)

	primary_label = Label.new()
	primary_label.text = "EMAIL CODE"
	primary_label.add_theme_font_size_override("font_size", 26)
	left_box.add_child(primary_label)

	detail_label = Label.new()
	detail_label.text = "operator@superior.local"
	detail_label.add_theme_font_size_override("font_size", 18)
	left_box.add_child(detail_label)

	var track := ColorRect.new()
	track.color = Color("#2a2219")
	track.size = Vector2(420, 7)
	track.custom_minimum_size = Vector2(420, 7)
	track.position = Vector2(430, 585)
	add_child(track)

	progress_fill = ColorRect.new()
	progress_fill.color = Color("#d7c18a")
	progress_fill.size = Vector2(1, 7)
	progress_fill.custom_minimum_size = Vector2(1, 7)
	progress_fill.position = Vector2(430, 585)
	add_child(progress_fill)

	_build_bot_stage()

	stamp_label = Label.new()
	stamp_label.position = Vector2(760, 514)
	stamp_label.text = "CLOUD / MOCK VERIFIED"
	stamp_label.add_theme_font_size_override("font_size", 22)
	add_child(stamp_label)

	var hint := Label.new()
	hint.position = Vector2(760, 550)
	hint.text = "ENTER TO FIT NEXT PART"
	hint.add_theme_font_size_override("font_size", 16)
	add_child(hint)

func _build_bot_stage() -> void:
	var pedestal := ColorRect.new()
	pedestal.color = Color("#8f5234")
	pedestal.position = Vector2(520, 402)
	pedestal.size = Vector2(240, 72)
	pedestal.custom_minimum_size = Vector2(240, 72)
	add_child(pedestal)

	bot_head = ColorRect.new()
	bot_head.color = Color("#6f8d58")
	bot_head.position = Vector2(585, 286)
	bot_head.size = Vector2(110, 110)
	bot_head.custom_minimum_size = Vector2(110, 110)
	add_child(bot_head)

	var eye_l := ColorRect.new()
	eye_l.color = Color("#dff8ff")
	eye_l.position = Vector2(620, 332)
	eye_l.size = Vector2(12, 12)
	eye_l.custom_minimum_size = Vector2(12, 12)
	add_child(eye_l)

	var eye_r := ColorRect.new()
	eye_r.color = Color("#dff8ff")
	eye_r.position = Vector2(656, 332)
	eye_r.size = Vector2(12, 12)
	eye_r.custom_minimum_size = Vector2(12, 12)
	add_child(eye_r)

	var antenna := ColorRect.new()
	antenna.color = Color("#c69b4e")
	antenna.position = Vector2(628, 244)
	antenna.size = Vector2(16, 42)
	antenna.custom_minimum_size = Vector2(16, 42)
	add_child(antenna)

	var part_specs := [
		[Vector2(572, 326), Vector2(24, 38), "#d7a84c"],
		[Vector2(688, 316), Vector2(34, 42), "#e4c89d"],
		[Vector2(612, 262), Vector2(48, 16), "#c99c4a"]
	]

	for spec in part_specs:
		var part := ColorRect.new()
		part.color = Color(str(spec[2]))
		part.position = spec[0]
		part.size = spec[1]
		part.custom_minimum_size = spec[1]
		part.visible = false
		skill_parts.append(part)
		add_child(part)

func _update_motion() -> void:
	if bot_head:
		bot_head.position.y = 286.0 + sin(Time.get_ticks_msec() * 0.004) * 4.0
	if stamp_label:
		stamp_label.modulate = Color(1, 1, 1, 0.75 + abs(sin(Time.get_ticks_msec() * 0.006)) * 0.25)

func _save_setup_complete() -> void:
	var file := FileAccess.open("user://superior-setup-complete.flag", FileAccess.WRITE)
	if file:
		file.store_string(Time.get_datetime_string_from_system(true))
