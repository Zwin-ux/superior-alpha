extends Control
class_name OnboardingController

const SFX_PLAYER := preload("res://scripts/sfx_player.gd")
const FACTORY_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-clay-factory-atlas.json"
const OWNERSHIP_ATLAS_MANIFEST_PATH := "res://assets/clay/superior-spore-ownership-atlas.json"
const SETUP_STATE_URL := "http://127.0.0.1:5317/setup-state"
const ACCOUNT_OAUTH_START_URL := "http://127.0.0.1:5317/account/start-oauth"
const BROWSER_PAIRING_START_URL := "http://127.0.0.1:5317/browser-link/start"
const BROWSER_PAIRING_RESET_URL := "http://127.0.0.1:5317/browser-link/reset"
const OPENAI_KEY_SAVE_URL := "http://127.0.0.1:5317/model-provider/openai-key"
const SETUP_POLL_INTERVAL := 1.2
const BROWSER_HAND_LABEL := "CHROME HAND"
const SPORE_NAME := "CLAWD"
const LEGACY_CHECK_TEXT := "REGISTER / Local Ollama / OpenAI BYOK / SAVE SPORE / BUILDER RACE / SIGNAL FOUND / CHOOSE BODY / BIND BROWSER HAND"

const STEPS := [
	{
		"id": "wake",
		"title": "FIRST BOOT",
		"primary": "POWER SPORE",
		"detail": "lamp warm / local core wakes",
		"stamp": "BOOT / AWAKE"
	},
	{
		"id": "body",
		"title": "BODY BIOS",
		"primary": "CHOOSE SHELL",
		"detail": "Orb / Scanner / Gremlin / Sentinel / Clawdbot",
		"stamp": "SHELL / WRITTEN"
	},
	{
		"id": "eye",
		"title": "VISION SLOT",
		"primary": "FIT EYE",
		"detail": "X-Ray Eye / reads structure",
		"stamp": "EYE / ATTACHED"
	},
	{
		"id": "role",
		"title": "OPERATOR",
		"primary": "STAMP ROLE",
		"detail": "builder seal / local work",
		"stamp": "ROLE / STAMPED"
	},
	{
		"id": "account",
		"title": "ACCOUNT SEAL",
		"primary": "CLAIM SPORE",
		"detail": "Google / X / Discord seal",
		"stamp": "ACCOUNT / LOCAL"
	},
	{
		"id": "browser",
		"title": "DEVICE HAND",
		"primary": "BIND HAND",
		"detail": "dock wake / icon transfer",
		"stamp": "HAND / READY"
	},
	{
		"id": "stamp",
		"title": "WORKSHOP KEY",
		"primary": "RUN X-RAY",
		"detail": "lens sweep / spore reacts",
		"stamp": "SYSTEM / READY"
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

const ACCOUNT_PROVIDERS := [
	{
		"id": "google",
		"label": "GOOGLE",
		"mark": "G",
		"color": Color("#4285f4")
	},
	{
		"id": "x",
		"label": "X",
		"mark": "X",
		"color": Color("#111111")
	},
	{
		"id": "discord",
		"label": "DISCORD",
		"mark": "D",
		"color": Color("#5865f2")
	}
]

const SYSTEM_CHECKS := [
	{
		"id": "core",
		"label": "LOCAL CORE",
		"ready_at": 0
	},
	{
		"id": "shell",
		"label": "SHELL BIOS",
		"ready_at": 1
	},
	{
		"id": "eye",
		"label": "X-RAY SLOT",
		"ready_at": 2
	},
	{
		"id": "role",
		"label": "ROLE BADGE",
		"ready_at": 3
	},
	{
		"id": "account",
		"label": "ACCOUNT SEAL",
		"ready_at": 4
	},
	{
		"id": "hand",
		"label": "CHROME HAND",
		"ready_at": 5
	},
	{
		"id": "save",
		"label": "SAVE SPORE",
		"ready_at": 6
	}
]

var step_index := 0
var selected_starter_index := 2
var elapsed := 0.0
var auto_demo := false
var showcase_mode := false
var strict_setup := false
var factory_atlas: Texture2D
var factory_image: Image
var ownership_atlas: Texture2D
var ownership_image: Image
var factory_textures: Dictionary = {}
var browser_recovery_override := ""
var setup_state: Dictionary = {}
var setup_state_loaded := false
var setup_state_error := ""
var setup_request_pending := false
var setup_poll_clock := 0.0
var setup_request: HTTPRequest
var action_request: HTTPRequest
var action_request_kind := ""
var selected_account_provider_index := 0
var account_provider_in_flight := ""
var account_feedback := ""
var account_feedback_is_error := false
var browser_pairing_token := ""
var recovery_feedback := ""
var recovery_feedback_is_error := false

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
var browser_title_label: Label
var browser_toolbar_slot: TextureRect
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
var browser_hand_shadow: Polygon2D
var browser_hand_shape: Polygon2D
var browser_hand_placeholder: ColorRect
var browser_recovery_slot: TextureRect
var browser_recovery_title_label: Label
var browser_recovery_detail_label: Label
var browser_recovery_note_label: Label
var browser_recovery_code_label: Label
var browser_recovery_action_plate: TextureRect
var browser_recovery_action_label: Label
var browser_recovery_indicator: ColorRect
var browser_recovery_feedback_label: Label
var browser_recovery_action_button: Button
var browser_recovery_reset_plate: TextureRect
var browser_recovery_reset_label: Label
var browser_recovery_reset_button: Button
var browser_key_input: LineEdit
var save_stamp_plate: TextureRect
var account_nodes: Array[CanvasItem] = []
var account_card: TextureRect
var account_title_label: Label
var account_detail_label: Label
var account_status_label: Label
var account_avatar_seed: TextureRect
var account_avatar_label: Label
var account_avatar_detail_label: Label
var account_provider_plates: Array[TextureRect] = []
var account_provider_lights: Array[ColorRect] = []
var account_provider_marks: Array[Label] = []
var account_provider_labels: Array[Label] = []
var account_provider_buttons: Array[Button] = []
var account_action_plate: TextureRect
var account_action_label: Label
var account_action_button: Button
var account_feedback_label: Label
var setup_console_panel: TextureRect
var setup_console_title_label: Label
var setup_console_detail_label: Label
var setup_console_meter_fill: ColorRect
var setup_console_leds: Array[ColorRect] = []
var setup_console_labels: Array[Label] = []
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
	strict_setup = OS.get_environment("SUPERIOR_STRICT_SETUP") == "1"
	browser_recovery_override = _normalize_browser_mode(OS.get_environment("SUPERIOR_BROWSER_RECOVERY"))
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
	_build_setup_probe()
	_render_step()
	sfx_player.play_sfx("boot_wake", 0.55)

func _process(delta: float) -> void:
	elapsed += delta
	if step_flash_timer > 0.0:
		step_flash_timer = max(0.0, step_flash_timer - delta)
	_update_motion()
	_update_time_based_labels()
	_tick_setup_poll(delta)
	if auto_demo and elapsed > _auto_step_seconds():
		_advance()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ENTER or event.keycode == KEY_SPACE:
			if _current_step_id() == "account" and strict_setup and _account_mode() != "signed_in":
				_trigger_account_action()
			elif _current_step_id() == "browser" and _browser_mode() != "transfer":
				_trigger_browser_recovery_action()
			else:
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
		if _current_step_id() == "account":
			if event.keycode == KEY_1:
				_select_account_provider(0)
			if event.keycode == KEY_2:
				_select_account_provider(1)
			if event.keycode == KEY_3:
				_select_account_provider(2)
			if event.keycode == KEY_R:
				account_feedback = ""
				account_feedback_is_error = false
				_request_setup_state()
				_render_step()
		if _current_step_id() == "browser":
			if event.keycode == KEY_1:
				_set_browser_recovery_override("transfer")
			if event.keycode == KEY_2:
				_set_browser_recovery_override("daemon_offline")
			if event.keycode == KEY_3:
				_set_browser_recovery_override("key_missing")
			if event.keycode == KEY_4:
				_set_browser_recovery_override("browser_unbound")
			if event.keycode == KEY_R:
				browser_recovery_override = ""
				_request_setup_state()
				_render_step()
			if event.keycode == KEY_BACKSPACE or event.keycode == KEY_DELETE:
				_reset_browser_pairing()

func _advance() -> void:
	elapsed = 0.0
	if _current_step_id() == "body":
		_select_starter(selected_starter_index)
	if _current_step_id() == "account" and strict_setup and _account_mode() != "signed_in":
		step_flash_timer = 0.48
		_trigger_account_action()
		if sfx_player:
			sfx_player.play_sfx("error", 0.52)
		return
	if _current_step_id() == "browser" and strict_setup and _browser_mode() != "transfer":
		step_flash_timer = 0.48
		_request_setup_state()
		if sfx_player:
			sfx_player.play_sfx("error", 0.82)
		return
	if step_index < STEPS.size() - 1:
		step_index += 1
		step_flash_timer = 0.38
		if _current_step_id() == "account" or _current_step_id() == "browser" or _current_step_id() == "stamp":
			_request_setup_state()
		_render_step()
		_play_step_sfx(_current_step_id())
		return

	_save_setup_complete()
	get_tree().change_scene_to_file("res://scenes/ClayWorkshop.tscn")

func _current_step_id() -> String:
	return str(STEPS[step_index]["id"])

func _select_starter(index: int) -> void:
	selected_starter_index = clamp(index, 0, STARTERS.size() - 1)
	_render_step()
	if sfx_player:
		sfx_player.play_sfx("select", 0.8)

func _select_account_provider(index: int) -> void:
	selected_account_provider_index = clamp(index, 0, ACCOUNT_PROVIDERS.size() - 1)
	account_feedback = ""
	account_feedback_is_error = false
	_render_step()
	if sfx_player:
		sfx_player.play_sfx("select", 0.66)

func _auto_step_seconds() -> float:
	return 1.55 if showcase_mode else 1.72

func _build_sfx() -> void:
	sfx_player = SFX_PLAYER.new()
	add_child(sfx_player)

func _build_setup_probe() -> void:
	setup_request = HTTPRequest.new()
	setup_request.name = "SetupStateProbe"
	add_child(setup_request)
	setup_request.request_completed.connect(_on_setup_state_response)
	action_request = HTTPRequest.new()
	action_request.name = "SetupActionProbe"
	add_child(action_request)
	action_request.request_completed.connect(_on_action_request_response)
	if strict_setup:
		_request_setup_state()

func _request_setup_state() -> void:
	if not setup_request or setup_request.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
		return
	setup_state_error = ""
	setup_request_pending = true
	var error := setup_request.request(SETUP_STATE_URL)
	if error != OK:
		setup_request_pending = false
		setup_state_error = "request failed"
		setup_state = {}
		setup_state_loaded = true
		_render_step()

func _on_setup_state_response(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	var previous_mode := _browser_mode()
	setup_request_pending = false
	setup_state_loaded = true
	if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
		setup_state = {}
		setup_state_error = "daemon offline"
		_render_step()
		return
	var parsed := _parse_json_dictionary(body)
	if parsed.is_empty():
		setup_state = {}
		setup_state_error = "bad response"
		_render_step()
		return
	setup_state = parsed
	setup_state_error = ""
	if _setup_browser_status() == "paired":
		browser_pairing_token = ""
	if _setup_key_ready() and browser_key_input:
		browser_key_input.text = ""
		browser_key_input.release_focus()
	var next_mode := _browser_mode()
	if previous_mode != next_mode:
		recovery_feedback = ""
		recovery_feedback_is_error = false
		elapsed = 0.0
		step_flash_timer = 0.32
	_render_step()

func _normalize_browser_mode(raw: String) -> String:
	match raw.to_lower().strip_edges():
		"transfer", "match":
			return "transfer"
		"daemon_offline", "daemon-offline", "offline":
			return "daemon_offline"
		"key_missing", "key-missing", "key":
			return "key_missing"
		"browser_unbound", "browser-unbound", "unbound":
			return "browser_unbound"
		_:
			return ""

func _set_browser_recovery_override(mode: String) -> void:
	var normalized := _normalize_browser_mode(mode)
	if normalized == "":
		return
	browser_recovery_override = normalized
	elapsed = 0.0
	step_flash_timer = 0.26
	_render_step()
	if sfx_player:
		sfx_player.play_sfx("select", 0.62)

func _browser_mode() -> String:
	var step_id := _current_step_id()
	if step_id == "stamp":
		return "transfer_complete"
	if step_id != "browser":
		return ""
	if browser_recovery_override != "":
		return browser_recovery_override
	if showcase_mode or auto_demo or not strict_setup:
		return "transfer"
	if setup_state_error != "":
		return "daemon_offline"
	if not setup_state_loaded:
		return "transfer"
	if not _setup_daemon_ready():
		return "daemon_offline"
	if not _setup_key_ready():
		return "key_missing"
	if _setup_browser_status() != "paired":
		return "browser_unbound"
	return "transfer"

func _setup_daemon_ready() -> bool:
	if typeof(setup_state) != TYPE_DICTIONARY:
		return false
	var daemon_state = setup_state.get("daemon", {})
	return typeof(daemon_state) == TYPE_DICTIONARY and str(daemon_state.get("status", "")) == "ready"

func _setup_key_ready() -> bool:
	if typeof(setup_state) != TYPE_DICTIONARY:
		return false
	var key_state = setup_state.get("key", {})
	return typeof(key_state) == TYPE_DICTIONARY and str(key_state.get("status", "")) == "ready"

func _setup_browser_status() -> String:
	if typeof(setup_state) != TYPE_DICTIONARY:
		return "unpaired"
	var browser_state = setup_state.get("browser", {})
	if typeof(browser_state) != TYPE_DICTIONARY:
		return "unpaired"
	return str(browser_state.get("status", "unpaired"))

func _account_state() -> Dictionary:
	if typeof(setup_state) != TYPE_DICTIONARY:
		return {}
	var account_state = setup_state.get("account", {})
	if typeof(account_state) != TYPE_DICTIONARY:
		return {}
	return account_state

func _account_status() -> String:
	return str(_account_state().get("status", "signed-out"))

func _account_mode() -> String:
	var step_id := _current_step_id()
	if step_id != "account" and step_id != "stamp":
		return ""
	if showcase_mode or auto_demo or not strict_setup:
		if _account_status() == "signed-in":
			return "signed_in"
		return "local_only"
	if setup_state_error != "":
		return "offline"
	if not setup_state_loaded:
		return "checking"
	match _account_status():
		"signed-in":
			return "signed_in"
		"offline":
			return "offline"
		_:
			return "signed_out"

func _account_connected_providers() -> Array:
	var providers = _account_state().get("connectedProviders", [])
	if typeof(providers) != TYPE_ARRAY:
		return []
	return providers

func _account_provider_status(provider: String) -> String:
	for provider_state in _account_provider_states():
		if typeof(provider_state) == TYPE_DICTIONARY and str(provider_state.get("provider", "")) == provider:
			return str(provider_state.get("status", "available"))
	if _account_status() == "offline":
		return "not-configured"
	if _account_connected_providers().has(provider):
		return "connected"
	return "available"

func _account_provider_states() -> Array:
	var providers = _account_state().get("providers", [])
	if typeof(providers) != TYPE_ARRAY:
		return []
	return providers

func _selected_account_provider_id() -> String:
	var provider: Dictionary = ACCOUNT_PROVIDERS[selected_account_provider_index]
	return str(provider["id"])

func _selected_account_provider_label() -> String:
	var provider: Dictionary = ACCOUNT_PROVIDERS[selected_account_provider_index]
	return str(provider["label"])

func _account_identity_label() -> String:
	var account := _account_state()
	var handle := str(account.get("handle", "")).strip_edges()
	if handle != "":
		return handle
	var email := str(account.get("email", "")).strip_edges()
	if email != "":
		return email
	return "LOCAL OPERATOR"

func _account_avatar_mark() -> String:
	var identity := _account_identity_label().strip_edges()
	if identity == "":
		return "?"
	return identity.substr(0, 1).to_upper()

func _account_provider_summary() -> String:
	var providers := _account_connected_providers()
	if providers.is_empty():
		return "LOCAL"
	var labels: Array[String] = []
	for provider in providers:
		labels.append(str(provider).to_upper())
	return " / ".join(labels)

func _account_primary_copy(mode: String) -> String:
	match mode:
		"signed_in":
			return "SEAL CLAIMED"
		"signed_out":
			return "CHOOSE SEAL"
		"offline":
			return "KEEP LOCAL"
		"checking":
			return "CHECK SEAL"
		"local_only":
			return "LOCAL FIRST"
		_:
			return "CLAIM SPORE"

func _account_detail_copy(mode: String) -> String:
	match mode:
		"signed_in":
			return "%s / spore still local" % _account_identity_label()
		"signed_out":
			return "Google / X / Discord"
		"offline":
			return "account config missing / spore safe"
		"checking":
			return "reading daemon seal"
		"local_only":
			return "account optional / local spore owns body"
		_:
			return "Google / X / Discord seal"

func _account_stamp_copy(mode: String) -> String:
	match mode:
		"signed_in":
			return "ACCOUNT / LINKED"
		"signed_out":
			return "ACCOUNT / WAIT"
		"offline":
			return "ACCOUNT / LOCAL"
		"checking":
			return "ACCOUNT / CHECK"
		"local_only":
			return "ACCOUNT / LOCAL"
		_:
			return "ACCOUNT / LOCAL"

func _browser_primary_copy(mode: String, settled: bool = false) -> String:
	match mode:
		"daemon_offline":
			return "CHECK POWER"
		"key_missing":
			return "LOAD KEY"
		"browser_unbound":
			return "BIND HAND"
		"transfer_complete":
			return "RUN X-RAY"
		"transfer":
			return "ICON MATCH" if settled else "BIND HAND"
		_:
			return "BIND HAND"

func _browser_detail_copy(mode: String) -> String:
	match mode:
		"daemon_offline":
			return "lamp low / retry local daemon"
		"key_missing":
			return "paste key / save local"
		"browser_unbound":
			if _browser_pairing_stale():
				return "old token / clear daemon latch"
			return "paste token in extension" if _browser_pairing_ready() else "mint token / paste in extension"
		"transfer_complete":
			return "x-ray ready / workshop next"
		"transfer":
			return "toolbar takes Clawd"
		_:
			return "toolbar takes Clawd"

func _browser_stamp_copy(mode: String, settled: bool = false) -> String:
	match mode:
		"daemon_offline":
			return "DAEMON / OFFLINE"
		"key_missing":
			return "KEY / MISSING"
		"browser_unbound":
			return "HAND / UNBOUND"
		"transfer_complete":
			return "HAND / READY"
		"transfer":
			return "ICON / MATCH" if settled else "HAND / READY"
		_:
			return "HAND / READY"

func _browser_status_copy(mode: String, settled: bool = false) -> Array[String]:
	match mode:
		"daemon_offline":
			return _string_pair("DAEMON OFFLINE", "CHECK POWER")
		"key_missing":
			return _string_pair("KEY SLOT", "SAVE LOCAL")
		"browser_unbound":
			if _browser_pairing_stale():
				return _string_pair("PAIR STALE", "RESET PAIR")
			return _string_pair("PAIR TOKEN", "PASTE IN EXT") if _browser_pairing_ready() else _string_pair("HAND DOCK", "START PAIR")
		"transfer_complete":
			return _string_pair("ICON MATCH", "HAND READY")
		"transfer":
			return _string_pair("ICON MATCH", "HAND READY") if settled else _string_pair("HAND READY", "ICON WAIT")
		_:
			return _string_pair("HAND READY", "ICON WAIT")

func _browser_pairing_ready() -> bool:
	return browser_pairing_token.strip_edges() != ""

func _browser_pairing_waiting() -> bool:
	return _setup_browser_status() == "pairing"

func _browser_pairing_stale() -> bool:
	return _browser_pairing_waiting() and not _browser_pairing_ready()

func _browser_reset_available() -> bool:
	return _current_step_id() == "browser" and _browser_mode() == "browser_unbound" and (_browser_pairing_ready() or _browser_pairing_waiting())

func _browser_recovery_action_copy(mode: String) -> String:
	match mode:
		"daemon_offline":
			return "CHECKING" if setup_request_pending else "CHECK AGAIN"
		"key_missing":
			return "SAVING" if action_request_kind == "key_save" else "SAVE KEY"
		"browser_unbound":
			if action_request_kind == "pair_reset":
				return "RESETTING"
			if _browser_pairing_stale():
				return "RESET PAIR"
			if action_request_kind == "pair_start":
				return "STARTING"
			return "COPY TOKEN" if _browser_pairing_ready() else "START PAIR"
		_:
			return ""

func _browser_recovery_note_copy(mode: String) -> String:
	match mode:
		"daemon_offline":
			return "127.0.0.1:5317 / retry when awake"
		"key_missing":
			return "stored in local env file"
		"browser_unbound":
			if _browser_pairing_stale():
				return "daemon waiting on an older token"
			if _browser_pairing_ready():
				return "token copied / paste in extension popup"
			return "mint token from this workshop"
		_:
			return ""

func _browser_recovery_code_copy(mode: String) -> String:
	if mode == "browser_unbound" and _browser_pairing_ready():
		return browser_pairing_token
	return ""

func _tick_setup_poll(delta: float) -> void:
	if not strict_setup or browser_recovery_override != "":
		setup_poll_clock = 0.0
		return
	if _current_step_id() == "account":
		if _account_mode() == "signed_in":
			setup_poll_clock = 0.0
			return
	elif _current_step_id() == "browser":
		if _browser_mode() == "transfer" and _setup_browser_status() == "paired":
			setup_poll_clock = 0.0
			return
	else:
		setup_poll_clock = 0.0
		return
	setup_poll_clock += delta
	if setup_poll_clock < SETUP_POLL_INTERVAL:
		return
	setup_poll_clock = 0.0
	_request_setup_state()

func _trigger_account_action(provider_id: String = "") -> void:
	if action_request_kind != "" or not action_request:
		return
	var mode := _account_mode()
	if mode == "signed_in":
		_set_account_feedback("Seal already linked.", false)
		_render_step()
		return
	if mode == "offline":
		_set_account_feedback("Account config missing. Local spore stays safe.", true)
		_request_setup_state()
		_render_step()
		return
	if mode == "checking":
		_set_account_feedback("Reading account seal...", false)
		_request_setup_state()
		_render_step()
		return
	var provider := provider_id.strip_edges()
	if provider == "":
		provider = _selected_account_provider_id()
	if _account_provider_status(provider) == "not-configured":
		_set_account_feedback("Provider not configured in Supabase.", true)
		_render_step()
		return
	action_request_kind = "account_oauth"
	account_provider_in_flight = provider
	_set_account_feedback("Opening %s seal..." % _format_account_provider_label(provider), false)
	var payload := {
		"type": "superior-account-start-oauth",
		"provider": provider,
		"redirectTo": "http://127.0.0.1:5317/account/oauth/callback"
	}
	var headers := PackedStringArray(["Content-Type: application/json"])
	var error := action_request.request(ACCOUNT_OAUTH_START_URL, headers, HTTPClient.METHOD_POST, JSON.stringify(payload))
	if error != OK:
		action_request_kind = ""
		account_provider_in_flight = ""
		_set_account_feedback("Could not open account seal.", true)
		if sfx_player:
			sfx_player.play_sfx("error", 0.82)
		_render_step()
		return
	_render_step()

func _format_account_provider_label(provider_id: String) -> String:
	for provider in ACCOUNT_PROVIDERS:
		if str(provider["id"]) == provider_id:
			return str(provider["label"])
	return provider_id.to_upper()

func _trigger_browser_recovery_action() -> void:
	if _current_step_id() != "browser":
		return
	match _browser_mode():
		"daemon_offline":
			_set_recovery_feedback("Checking daemon...", false)
			_request_setup_state()
			if sfx_player:
				sfx_player.play_sfx("select", 0.58)
		"key_missing":
			_save_openai_key()
		"browser_unbound":
			if _browser_pairing_stale():
				_reset_browser_pairing()
				return
			if _browser_pairing_ready():
				_copy_browser_pairing_token()
			else:
				_start_browser_pairing()

func _copy_browser_pairing_token() -> void:
	if not _browser_pairing_ready():
		_set_recovery_feedback("Start pairing first.", true)
		if sfx_player:
			sfx_player.play_sfx("error", 0.82)
		return
	DisplayServer.clipboard_set(browser_pairing_token)
	_set_recovery_feedback("Token copied. Paste it in the extension popup.", false)
	if sfx_player:
		sfx_player.play_sfx("select", 0.7)

func _start_browser_pairing() -> void:
	if action_request_kind != "" or not action_request:
		return
	action_request_kind = "pair_start"
	_set_recovery_feedback("Minting pairing token...", false)
	var error := action_request.request(BROWSER_PAIRING_START_URL, PackedStringArray(), HTTPClient.METHOD_POST)
	if error != OK:
		action_request_kind = ""
		_set_recovery_feedback("Could not start pairing.", true)
		if sfx_player:
			sfx_player.play_sfx("error", 0.82)
		_render_step()
		return
	_render_step()

func _reset_browser_pairing() -> void:
	if not _browser_reset_available():
		return
	browser_pairing_token = ""
	if browser_key_input:
		browser_key_input.release_focus()
	_set_recovery_feedback("Pair reset. Start again.", false)
	if action_request_kind != "" or not action_request:
		_request_setup_state()
		_render_step()
		return
	action_request_kind = "pair_reset"
	var error := action_request.request(BROWSER_PAIRING_RESET_URL, PackedStringArray(), HTTPClient.METHOD_POST)
	if error != OK:
		action_request_kind = ""
		_set_recovery_feedback("Local token cleared. Check daemon power.", false)
		_request_setup_state()
		_render_step()
		return
	if sfx_player:
		sfx_player.play_sfx("select", 0.68)
	_render_step()

func _save_openai_key() -> void:
	if action_request_kind != "" or not action_request or not browser_key_input:
		return
	var api_key := browser_key_input.text.strip_edges()
	if api_key == "":
		browser_key_input.grab_focus()
		_set_recovery_feedback("Paste an OpenAI key first.", true)
		if sfx_player:
			sfx_player.play_sfx("error", 0.82)
		_render_step()
		return
	action_request_kind = "key_save"
	_set_recovery_feedback("Saving local key...", false)
	var payload := {
		"type": "superior-openai-key-save",
		"apiKey": api_key
	}
	var headers := PackedStringArray(["Content-Type: application/json"])
	var error := action_request.request(OPENAI_KEY_SAVE_URL, headers, HTTPClient.METHOD_POST, JSON.stringify(payload))
	if error != OK:
		action_request_kind = ""
		_set_recovery_feedback("Could not save key.", true)
		if sfx_player:
			sfx_player.play_sfx("error", 0.82)
		_render_step()
		return
	_render_step()

func _on_action_request_response(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	var kind := action_request_kind
	action_request_kind = ""
	var payload := _parse_json_dictionary(body)
	if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
		if kind == "account_oauth":
			_set_account_feedback(_response_message(payload, "Account seal failed."), true)
			account_provider_in_flight = ""
			if sfx_player:
				sfx_player.play_sfx("error", 0.82)
			_render_step()
			return
		if kind == "pair_reset":
			_set_recovery_feedback("Local token cleared. Check daemon power.", false)
			_request_setup_state()
			_render_step()
			return
		_set_recovery_feedback(_response_message(payload, "Action failed."), true)
		if sfx_player:
			sfx_player.play_sfx("error", 0.82)
		_render_step()
		return
	match kind:
		"account_oauth":
			var auth_url := str(payload.get("authUrl", "")).strip_edges()
			if auth_url == "":
				_set_account_feedback("OAuth URL missing from daemon.", true)
				if sfx_player:
					sfx_player.play_sfx("error", 0.82)
				_render_step()
				return
			OS.shell_open(auth_url)
			_set_account_feedback("%s opened. Return after the seal lands." % _format_account_provider_label(account_provider_in_flight), false)
			account_provider_in_flight = ""
			if sfx_player:
				sfx_player.play_sfx("browser_bind", 0.62)
		"pair_start":
			var token := str(payload.get("pairingToken", "")).strip_edges()
			if token == "":
				_set_recovery_feedback("Daemon did not return a pairing token.", true)
				if sfx_player:
					sfx_player.play_sfx("error", 0.82)
				_render_step()
				return
			browser_pairing_token = token
			DisplayServer.clipboard_set(browser_pairing_token)
			_set_recovery_feedback("Token copied. Paste it in the extension popup.", false)
			if sfx_player:
				sfx_player.play_sfx("browser_bind", 0.74)
		"pair_reset":
			_set_recovery_feedback("Pair reset. Start again.", false)
			if sfx_player:
				sfx_player.play_sfx("select", 0.64)
		"key_save":
			if browser_key_input:
				browser_key_input.text = ""
				browser_key_input.release_focus()
			_set_recovery_feedback("Key saved local to the daemon.", false)
			if sfx_player:
				sfx_player.play_sfx("attach", 0.76)
	_request_setup_state()
	_render_step()

func _set_account_feedback(text: String, is_error: bool) -> void:
	account_feedback = text
	account_feedback_is_error = is_error

func _set_recovery_feedback(text: String, is_error: bool) -> void:
	recovery_feedback = text
	recovery_feedback_is_error = is_error

func _string_pair(first: String, second: String) -> Array[String]:
	var pair: Array[String] = []
	pair.append(first)
	pair.append(second)
	return pair

func _parse_json_dictionary(body: PackedByteArray) -> Dictionary:
	var parsed = JSON.parse_string(body.get_string_from_utf8())
	if typeof(parsed) != TYPE_DICTIONARY:
		return {}
	return parsed

func _response_message(payload: Dictionary, fallback: String) -> String:
	var message := str(payload.get("message", "")).strip_edges()
	if message != "":
		return message
	var detail := str(payload.get("detail", "")).strip_edges()
	if detail != "":
		return detail
	return fallback

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
		"account":
			sfx_player.play_sfx("equip", 0.76)
		"browser":
			sfx_player.play_sfx("browser_bind", 0.9)
		"stamp":
			sfx_player.play_sfx("stamp", 0.88)
		_:
			sfx_player.play_sfx("step", 0.7)

func _render_step() -> void:
	var step: Dictionary = STEPS[step_index]
	var step_id := _current_step_id()
	var browser_mode := _browser_mode()
	title_label.text = str(step["title"])
	primary_label.text = str(step["primary"])
	detail_label.text = str(step["detail"])
	stamp_label.text = str(step["stamp"])
	if step_id == "account":
		var account_mode := _account_mode()
		primary_label.text = _account_primary_copy(account_mode)
		detail_label.text = _account_detail_copy(account_mode)
		stamp_label.text = _account_stamp_copy(account_mode)
	elif step_id == "browser":
		primary_label.text = _browser_primary_copy(browser_mode)
		detail_label.text = _browser_detail_copy(browser_mode)
		stamp_label.text = _browser_stamp_copy(browser_mode)
	elif step_id == "stamp":
		primary_label.text = "RUN X-RAY"
		detail_label.text = "lens sweep / icon match / stamp"
		stamp_label.text = "SPORE / STAMPED"
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

	_set_tray_shell_visible(step_id != "wake" and step_id != "account" and step_id != "browser")
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
			selected_label.text = "PICK BODY"
			detail_label.text = "Gremlin / Moss / Pixel  -  scrappy builder"
		if step_id == "account":
			detail_label.text = _account_detail_copy(_account_mode())
		elif step_id == "browser":
			detail_label.text = _browser_detail_copy(browser_mode)
		elif step_id == "stamp":
			detail_label.text = "lens sweep / icon match / stamp"
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
	if step_id != "browser" and browser_key_input:
		browser_key_input.release_focus()
	_set_account_seal_visible(step_id == "account")
	_sync_account_seal_visuals()
	_set_browser_dock_visible(step_id == "browser" or step_id == "stamp")
	_sync_browser_transfer_visuals()
	var browser_status_copy := _browser_status_copy(browser_mode if step_id == "browser" else "transfer_complete")
	if browser_status_label:
		browser_status_label.text = browser_status_copy[0]
	if browser_ping_label:
		browser_ping_label.text = browser_status_copy[1]
	_update_status_leds()
	_update_setup_console()

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
	registry_icon_label.text = "SEAL    %s" % _account_provider_summary()
	registry_seal_label.text = "X-RAY"

func _sync_account_seal_visuals() -> void:
	if _current_step_id() != "account":
		return
	var mode := _account_mode()
	var selected_provider := _selected_account_provider_id()
	if account_title_label:
		account_title_label.text = "ACCOUNT SEAL"
	if account_detail_label:
		account_detail_label.text = "spore stays local / account signs proof"
	if account_avatar_label:
		account_avatar_label.text = _account_avatar_mark()
	if account_avatar_detail_label:
		account_avatar_detail_label.text = "PFP / %s" % ("READY" if mode == "signed_in" else "LOCAL")
	if account_status_label:
		account_status_label.text = _account_detail_copy(mode)
		account_status_label.add_theme_color_override("font_color", Color("#256d38") if mode == "signed_in" else Color("#8a5e38") if mode == "local_only" else Color("#9b5f38") if mode == "offline" else Color("#4f3927"))
	for index in range(account_provider_plates.size()):
		var provider: Dictionary = ACCOUNT_PROVIDERS[index]
		var provider_id := str(provider["id"])
		var selected := provider_id == selected_provider
		var connected := _account_provider_status(provider_id) == "connected"
		var configured := _account_provider_status(provider_id) != "not-configured"
		var pending := action_request_kind == "account_oauth" and account_provider_in_flight == provider_id
		account_provider_plates[index].texture = _factory_texture("scene.tray-slot.equipped" if selected or connected else "scene.tray-slot.empty")
		account_provider_plates[index].scale = Vector2(1.035, 1.035) if selected else Vector2.ONE
		account_provider_plates[index].modulate = Color("#dff7aa") if connected else Color("#fff0b1") if selected else Color("#8f806d") if configured else Color("#665c51")
		account_provider_lights[index].color = Color("#69b65b") if connected else provider["color"] if selected and configured else Color("#d46a5c") if not configured else Color("#7b746a")
		account_provider_lights[index].modulate.a = 0.62 + absf(sin(Time.get_ticks_msec() * 0.008 + index)) * 0.34 if selected or pending else 0.82
		account_provider_marks[index].text = str(provider["mark"])
		account_provider_marks[index].add_theme_color_override("font_color", Color("#1f160f") if configured else Color("#8a7a67"))
		account_provider_labels[index].text = "%s  %s" % [str(provider["label"]), "LINKED" if connected else "OPEN" if configured else "OFF"]
		account_provider_labels[index].add_theme_color_override("font_color", Color("#1f160f") if selected or connected else Color("#5f4b34") if configured else Color("#8a7a67"))
		if index < account_provider_buttons.size():
			account_provider_buttons[index].disabled = action_request_kind != "" or not configured
	if account_action_label:
		if mode == "signed_in":
			account_action_label.text = "SEAL READY"
		elif action_request_kind == "account_oauth":
			account_action_label.text = "OPENING %s" % _format_account_provider_label(account_provider_in_flight)
		elif mode == "offline":
			account_action_label.text = "LOCAL ONLY"
		else:
			account_action_label.text = "OPEN %s" % _selected_account_provider_label()
	if account_action_plate:
		account_action_plate.modulate = Color("#dff7aa") if mode == "signed_in" else Color("#d7c18a") if mode != "offline" else Color("#a27562")
	if account_action_button:
		account_action_button.disabled = action_request_kind != "" or mode == "signed_in" or mode == "offline"
	if account_feedback_label:
		account_feedback_label.visible = account_feedback.strip_edges() != ""
		account_feedback_label.text = account_feedback
		account_feedback_label.add_theme_color_override("font_color", Color("#f3b2a2") if account_feedback_is_error else Color("#dff7aa"))

func _update_setup_console() -> void:
	if setup_console_meter_fill:
		setup_console_meter_fill.size = Vector2(296.0 * float(step_index + 1) / float(STEPS.size()), 5)
	if setup_console_detail_label:
		setup_console_detail_label.text = _setup_console_detail()
	for index in range(setup_console_labels.size()):
		var check: Dictionary = SYSTEM_CHECKS[index]
		var ready_at := int(check["ready_at"])
		var check_id := str(check["id"])
		var active := step_index == ready_at
		var complete := step_index > ready_at
		var suffix := _setup_console_suffix(check_id, active, complete)
		setup_console_labels[index].text = "%s  %s" % [str(check["label"]), suffix]
		setup_console_labels[index].add_theme_color_override("font_color", Color("#dff7aa") if suffix == "OK" or suffix == "LINK" else Color("#fff0b1") if active else Color("#8a7a67"))
		setup_console_leds[index].color = _setup_console_color(check_id, active, complete)

func _setup_console_detail() -> String:
	match _current_step_id():
		"wake":
			return "boot lamp / local core"
		"body":
			return "write shell silhouette"
		"eye":
			return "fit x-ray lens"
		"role":
			return "stamp builder role"
		"account":
			return "OAuth seals, spore stays local"
		"browser":
			return "bind browser hand"
		"stamp":
			return "save spore / open shop"
		_:
			return "first boot"

func _setup_console_suffix(check_id: String, active: bool, complete: bool) -> String:
	match check_id:
		"account":
			match _account_mode():
				"signed_in":
					return "LINK"
				"offline":
					return "LOCAL"
				"checking":
					return "SCAN"
				_:
					return "SEAL" if active else "WAIT" if not complete else "OK"
		"hand":
			if _browser_is_bound() or _current_step_id() == "stamp":
				return "OK"
			return "HAND" if active else "WAIT"
		"save":
			if _current_step_id() == "stamp" and elapsed > 1.06:
				return "OK"
			return "SAVE" if active else "WAIT"
		_:
			if complete:
				return "OK"
			if active:
				return "RUN"
			return "WAIT"

func _setup_console_color(check_id: String, active: bool, complete: bool) -> Color:
	if check_id == "account":
		match _account_mode():
			"signed_in":
				return Color("#69b65b")
			"offline":
				return Color("#d6a841")
			"checking":
				return Color("#d6a841")
	if check_id == "hand" and (_browser_is_bound() or _current_step_id() == "stamp"):
		return Color("#69b65b")
	if check_id == "save" and _current_step_id() == "stamp" and elapsed > 1.06:
		return Color("#69b65b")
	if complete:
		return Color("#69b65b")
	if active:
		return Color("#d6a841")
	return Color("#3b352d")

func _body_is_on_bench() -> bool:
	var step_id := _current_step_id()
	return step_id == "body" or step_id == "eye" or step_id == "role" or step_id == "account" or step_id == "browser" or step_id == "stamp"

func _eye_is_equipped() -> bool:
	var step_id := _current_step_id()
	return step_id == "eye" or step_id == "role" or step_id == "account" or step_id == "browser" or step_id == "stamp"

func _role_is_equipped() -> bool:
	var step_id := _current_step_id()
	return step_id == "role" or step_id == "account" or step_id == "browser" or step_id == "stamp"

func _browser_is_bound() -> bool:
	var step_id := _current_step_id()
	if step_id == "stamp":
		return true
	if step_id == "browser":
		return _browser_mode() == "transfer" and elapsed > 0.92
	return false

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
		match _browser_mode():
			"daemon_offline":
				return "POWER"
			"key_missing":
				return "KEY SLOT"
			"browser_unbound":
				return "HAND DOCK"
			_:
				return "BROWSER HAND"
	if step_id == "stamp":
		return "SPORE KIT"
	return "SPORE KIT"

func _rail_label(index: int) -> String:
	var label := str(STEPS[index]["title"])
	return "%02d %s" % [index + 1, label]

func _update_status_leds() -> void:
	var step_id := _current_step_id()
	var browser_mode := _browser_mode()
	var browser_ready := _browser_is_bound() and (step_id != "browser" or elapsed > 0.92)
	var workshop_ready := step_id == "stamp" and elapsed > 1.08
	var labels := [
		"DAEMON READY",
		"KEY READY",
		"HAND READY" if browser_ready else "HAND WAIT",
		"OPEN WORKSHOP" if workshop_ready else "WORKSHOP LOCK"
	]
	var colors := [
		Color("#69b65b"),
		Color("#69b65b"),
		Color("#69b65b") if browser_ready else Color("#7b746a"),
		Color("#69b65b") if workshop_ready else Color("#7b746a")
	]
	if step_id == "browser":
		match browser_mode:
			"daemon_offline":
				labels[0] = "DAEMON OFFLINE"
				labels[1] = "KEY CHECK"
				labels[2] = "HAND LOCK"
				colors[0] = Color("#d46a5c")
				colors[1] = Color("#7b746a")
				colors[2] = Color("#7b746a")
			"key_missing":
				labels[1] = "KEY MISSING"
				labels[2] = "HAND LOCK"
				colors[1] = Color("#d46a5c")
				colors[2] = Color("#7b746a")
			"browser_unbound":
				labels[2] = "PAIR STALE" if _browser_pairing_stale() else "TOKEN READY" if _browser_pairing_ready() else "START PAIR"
				colors[2] = Color("#d6a841")
			"transfer":
				labels[2] = "ICON MATCH" if browser_ready else "HAND READY"
				colors[2] = Color("#69b65b") if browser_ready else Color("#d6a841")
			_:
				labels[2] = "HAND READY"
	if step_id == "stamp" and elapsed > 0.48 and elapsed <= 1.08:
		colors[3] = Color("#d6a841")
		labels[3] = "X-RAY DONE"
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
	if step_id == "account":
		var account_mode := _account_mode()
		primary_label.text = _account_primary_copy(account_mode)
		stamp_label.text = _account_stamp_copy(account_mode)
		_sync_account_seal_visuals()
	elif step_id == "browser":
		var browser_mode := _browser_mode()
		if elapsed > 0.94:
			primary_label.text = _browser_primary_copy(browser_mode, true)
			stamp_label.text = _browser_stamp_copy(browser_mode, true)
			var settled_copy := _browser_status_copy(browser_mode, true)
			if browser_status_label:
				browser_status_label.text = settled_copy[0]
			if browser_ping_label:
				browser_ping_label.text = settled_copy[1]
		else:
			primary_label.text = _browser_primary_copy(browser_mode)
			stamp_label.text = _browser_stamp_copy(browser_mode)
			var live_copy := _browser_status_copy(browser_mode)
			if browser_status_label:
				browser_status_label.text = live_copy[0]
			if browser_ping_label:
				browser_ping_label.text = live_copy[1]
	elif step_id == "stamp":
		if elapsed > 0.48:
			primary_label.text = "X-RAY DONE"
			if skill_ran_label:
				skill_ran_label.visible = true
		if elapsed > 1.06:
			stamp_label.text = "OPEN WORKSHOP"
			if registry_seal_label:
				registry_seal_label.text = "STAMPED"
	else:
		if skill_ran_label:
			skill_ran_label.visible = false
	_update_status_leds()
	_update_setup_console()

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
	_build_account_seal()
	_build_bottom_card()
	_build_setup_console()
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
	for index in range(STEPS.size()):
		var y := 154 + index * 46
		var slab := _add_texture("scene.menu-slab.default", Vector2(108, y), Vector2(172, 46), "SetupStep%s" % index)
		slab.pivot_offset = Vector2(86, 23)
		var label := _add_label("%02d %s" % [index + 1, str(STEPS[index]["title"])], Vector2(136, y + 10), Vector2(132, 24), 13, Color("#23170f"), HORIZONTAL_ALIGNMENT_LEFT)
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
	skill_ran_label = _add_label("X-RAY DONE", Vector2(532, 478), Vector2(216, 28), 24, Color("#dff8ff"), HORIZONTAL_ALIGNMENT_CENTER)
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

	browser_hand_shadow = _add_browser_hand_polygon("ChromeHandShadow", PackedVector2Array([
		Vector2(-170, 78),
		Vector2(-126, 34),
		Vector2(-96, -44),
		Vector2(-44, -126),
		Vector2(6, -154),
		Vector2(54, -130),
		Vector2(90, -88),
		Vector2(130, -48),
		Vector2(168, -18),
		Vector2(196, 10),
		Vector2(178, 44),
		Vector2(120, 66),
		Vector2(44, 56),
		Vector2(-14, 72),
		Vector2(-76, 92)
	]), Color(0.12, 0.08, 0.06, 0.34))
	browser_hand_shadow.position = Vector2(694, 386)
	browser_hand_shadow.z_index = 18
	_remember_browser_node(browser_hand_shadow)

	browser_hand_shape = _add_browser_hand_polygon("ChromeHandShape", PackedVector2Array([
		Vector2(-168, 70),
		Vector2(-124, 28),
		Vector2(-92, -46),
		Vector2(-42, -122),
		Vector2(2, -150),
		Vector2(52, -130),
		Vector2(86, -92),
		Vector2(124, -54),
		Vector2(164, -22),
		Vector2(190, 6),
		Vector2(174, 38),
		Vector2(120, 58),
		Vector2(46, 48),
		Vector2(-10, 64),
		Vector2(-72, 86)
	]), Color("#7faea6"))
	browser_hand_shape.position = Vector2(686, 368)
	browser_hand_shape.z_index = 19
	_remember_browser_node(browser_hand_shape)

	browser_card = _add_texture("ownership.chrome-hand.dock", Vector2(698, 188), Vector2(322, 278), "ChromeHandDock")
	_remember_browser_node(browser_card)
	browser_title_label = _add_label("BROWSER HAND", Vector2(748, 240), Vector2(218, 22), 15, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_title_label)

	browser_toolbar_slot = _add_texture("ownership.chrome-toolbar.slot", Vector2(742, 280), Vector2(220, 96), "ChromeToolbarSlot")
	_remember_browser_node(browser_toolbar_slot)

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

	browser_hand_placeholder = _add_dot(Vector2(666, 308), Color("#efe0bb"), "ChromeHandPlaceholder")
	browser_hand_placeholder.size = Vector2(18, 18)
	browser_hand_placeholder.z_index = 22
	_remember_browser_node(browser_hand_placeholder)

	browser_recovery_slot = _add_texture("scene.tray-slot.empty", Vector2(764, 290), Vector2(188, 82), "BrowserRecoverySlot")
	browser_recovery_slot.pivot_offset = Vector2(94, 41)
	_remember_browser_node(browser_recovery_slot)
	browser_recovery_title_label = _add_label("HAND DOCK", Vector2(782, 304), Vector2(152, 18), 16, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_recovery_title_label)
	browser_recovery_detail_label = _add_label("dock waiting / slot empty", Vector2(780, 330), Vector2(156, 20), 11, Color("#70543d"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_recovery_detail_label)
	browser_recovery_note_label = _add_label("mint token from this workshop", Vector2(772, 354), Vector2(172, 16), 10, Color("#8a5e38"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_recovery_note_label)
	browser_recovery_code_label = _add_label("", Vector2(772, 374), Vector2(172, 20), 15, Color("#fff0b1"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_recovery_code_label)
	browser_key_input = LineEdit.new()
	browser_key_input.name = "BrowserRecoveryKeyInput"
	browser_key_input.position = Vector2(754, 372)
	browser_key_input.size = Vector2(208, 28)
	browser_key_input.placeholder_text = "paste OpenAI key"
	browser_key_input.secret = true
	browser_key_input.caret_blink = true
	browser_key_input.mouse_default_cursor_shape = Control.CURSOR_IBEAM
	browser_key_input.add_theme_font_size_override("font_size", 13)
	browser_key_input.add_theme_color_override("font_color", Color("#23170f"))
	browser_key_input.add_theme_color_override("font_placeholder_color", Color("#70543d"))
	browser_key_input.add_theme_stylebox_override("normal", _make_recovery_field_stylebox(Color("#f1ddad"), Color("#8c6a4b")))
	browser_key_input.add_theme_stylebox_override("read_only", _make_recovery_field_stylebox(Color("#d0c3a2"), Color("#8c6a4b")))
	browser_key_input.add_theme_stylebox_override("focus", _make_recovery_field_stylebox(Color("#f6e8bf"), Color("#d6a841")))
	browser_key_input.text_changed.connect(_on_browser_key_changed)
	browser_key_input.text_submitted.connect(_on_browser_key_submitted)
	add_child(browser_key_input)
	_remember_browser_node(browser_key_input)
	browser_recovery_action_plate = _add_texture("scene.menu-slab.pressed", Vector2(742, 410), Vector2(232, 54), "BrowserRecoveryAction")
	browser_recovery_action_plate.pivot_offset = Vector2(116, 27)
	_remember_browser_node(browser_recovery_action_plate)
	browser_recovery_action_button = Button.new()
	browser_recovery_action_button.name = "BrowserRecoveryActionButton"
	browser_recovery_action_button.flat = true
	browser_recovery_action_button.text = ""
	browser_recovery_action_button.focus_mode = Control.FOCUS_NONE
	browser_recovery_action_button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	browser_recovery_action_button.set_anchors_preset(Control.PRESET_FULL_RECT)
	browser_recovery_action_button.pressed.connect(_on_browser_recovery_action_pressed)
	browser_recovery_action_plate.add_child(browser_recovery_action_button)
	browser_recovery_indicator = _add_dot(Vector2(778, 431), Color("#d6a841"), "BrowserRecoveryIndicator")
	browser_recovery_indicator.size = Vector2(14, 14)
	browser_recovery_indicator.z_index = 22
	_remember_browser_node(browser_recovery_indicator)
	browser_recovery_action_label = _add_label("BIND HAND", Vector2(796, 422), Vector2(156, 20), 15, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_recovery_action_label)
	browser_recovery_feedback_label = _add_label("", Vector2(746, 470), Vector2(224, 18), 10, Color("#dff7aa"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_recovery_feedback_label)
	browser_recovery_reset_plate = _add_texture("scene.menu-slab.default", Vector2(808, 492), Vector2(102, 28), "BrowserRecoveryReset")
	browser_recovery_reset_plate.pivot_offset = Vector2(51, 14)
	_remember_browser_node(browser_recovery_reset_plate)
	browser_recovery_reset_button = Button.new()
	browser_recovery_reset_button.name = "BrowserRecoveryResetButton"
	browser_recovery_reset_button.flat = true
	browser_recovery_reset_button.text = ""
	browser_recovery_reset_button.focus_mode = Control.FOCUS_NONE
	browser_recovery_reset_button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	browser_recovery_reset_button.set_anchors_preset(Control.PRESET_FULL_RECT)
	browser_recovery_reset_button.pressed.connect(_on_browser_recovery_reset_pressed)
	browser_recovery_reset_plate.add_child(browser_recovery_reset_button)
	browser_recovery_reset_label = _add_label("RESET PAIR", Vector2(822, 496), Vector2(74, 18), 10, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_browser_node(browser_recovery_reset_label)

func _build_account_seal() -> void:
	account_card = _add_texture("scene.right-tray", Vector2(912, 124), Vector2(300, 432), "AccountSealTray")
	_remember_account_node(account_card)
	account_title_label = _add_label("ACCOUNT SEAL", Vector2(948, 158), Vector2(228, 28), 22, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_account_node(account_title_label)
	account_detail_label = _add_label("local spore owns the body", Vector2(942, 190), Vector2(238, 18), 11, Color("#70543d"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_account_node(account_detail_label)

	account_avatar_seed = _add_texture("boot.seed", Vector2(1018, 216), Vector2(78, 78), "AccountSealAvatar")
	account_avatar_seed.pivot_offset = Vector2(39, 39)
	account_avatar_seed.modulate = Color("#d7c18a")
	_remember_account_node(account_avatar_seed)
	account_avatar_label = _add_label("?", Vector2(1038, 237), Vector2(38, 28), 24, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_account_node(account_avatar_label)
	account_avatar_detail_label = _add_label("PFP / LOCAL", Vector2(970, 294), Vector2(174, 18), 10, Color("#70543d"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_account_node(account_avatar_detail_label)

	account_status_label = _add_label("Choose a seal", Vector2(944, 322), Vector2(238, 18), 11, Color("#4f3927"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_account_node(account_status_label)

	for index in range(ACCOUNT_PROVIDERS.size()):
		var provider: Dictionary = ACCOUNT_PROVIDERS[index]
		var y := 352 + index * 42
		var plate := _add_texture("scene.tray-slot.empty", Vector2(940, y), Vector2(238, 36), "AccountProvider%s" % index)
		plate.pivot_offset = Vector2(119, 18)
		_remember_account_node(plate)
		account_provider_plates.append(plate)
		var light := _add_dot(Vector2(956, y + 13), provider["color"], "AccountProviderLight%s" % index)
		light.size = Vector2(10, 10)
		_remember_account_node(light)
		account_provider_lights.append(light)
		var mark := _add_label(str(provider["mark"]), Vector2(972, y + 8), Vector2(22, 18), 13, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
		_remember_account_node(mark)
		account_provider_marks.append(mark)
		var label := _add_label(str(provider["label"]), Vector2(1002, y + 8), Vector2(132, 18), 13, Color("#23170f"), HORIZONTAL_ALIGNMENT_LEFT)
		_remember_account_node(label)
		account_provider_labels.append(label)
		var button := Button.new()
		button.name = "AccountProviderButton%s" % index
		button.flat = true
		button.text = ""
		button.focus_mode = Control.FOCUS_NONE
		button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		button.set_anchors_preset(Control.PRESET_FULL_RECT)
		button.pressed.connect(_on_account_provider_pressed.bind(index))
		plate.add_child(button)
		account_provider_buttons.append(button)

	account_action_plate = _add_texture("scene.menu-slab.pressed", Vector2(940, 486), Vector2(238, 44), "AccountSealAction")
	account_action_plate.pivot_offset = Vector2(119, 22)
	_remember_account_node(account_action_plate)
	account_action_button = Button.new()
	account_action_button.name = "AccountSealActionButton"
	account_action_button.flat = true
	account_action_button.text = ""
	account_action_button.focus_mode = Control.FOCUS_NONE
	account_action_button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	account_action_button.set_anchors_preset(Control.PRESET_FULL_RECT)
	account_action_button.pressed.connect(_on_account_action_pressed)
	account_action_plate.add_child(account_action_button)
	account_action_label = _add_label("OPEN GOOGLE", Vector2(972, 497), Vector2(144, 20), 14, Color("#23170f"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_account_node(account_action_label)
	account_feedback_label = _add_label("", Vector2(932, 532), Vector2(252, 18), 10, Color("#dff7aa"), HORIZONTAL_ALIGNMENT_CENTER)
	_remember_account_node(account_feedback_label)

func _remember_account_node(node: CanvasItem) -> void:
	if node.z_index == 0:
		node.z_index = 21
	node.visible = false
	account_nodes.append(node)

func _set_account_seal_visible(visible: bool) -> void:
	for node in account_nodes:
		node.visible = visible

func _remember_browser_node(node: CanvasItem) -> void:
	if node.z_index == 0:
		node.z_index = 20
	node.visible = false
	browser_dock_nodes.append(node)

func _set_browser_dock_visible(visible: bool) -> void:
	for node in browser_dock_nodes:
		node.visible = visible

func _sync_browser_transfer_visuals() -> void:
	var mode := _browser_mode()
	var transfer_mode := mode == "transfer" or mode == "transfer_complete"
	var recovery_mode := mode == "daemon_offline" or mode == "key_missing" or mode == "browser_unbound"
	var old_icon_alpha := 0.0
	var clawd_icon_alpha := 0.0
	if mode == "transfer":
		old_icon_alpha = 1.0 - smoothstep(0.54, 0.94, elapsed)
		clawd_icon_alpha = 1.0
	elif mode == "transfer_complete":
		clawd_icon_alpha = 1.0
	if browser_title_label:
		match mode:
			"daemon_offline":
				browser_title_label.text = "POWER"
			"key_missing":
				browser_title_label.text = "KEY SLOT"
			"browser_unbound":
				browser_title_label.text = "HAND DOCK"
			_:
				browser_title_label.text = BROWSER_HAND_LABEL
	if browser_toolbar_slot:
		browser_toolbar_slot.visible = transfer_mode
	if browser_cable:
		browser_cable.visible = transfer_mode
	if browser_ext_label:
		browser_ext_label.visible = transfer_mode and old_icon_alpha > 0.02
	if browser_default_icon:
		browser_default_icon.visible = transfer_mode
		browser_default_icon.modulate.a = old_icon_alpha
	if browser_default_eye_l:
		browser_default_eye_l.visible = transfer_mode
		browser_default_eye_l.modulate.a = old_icon_alpha
	if browser_default_eye_r:
		browser_default_eye_r.visible = transfer_mode
		browser_default_eye_r.modulate.a = old_icon_alpha
	if browser_icon_body:
		browser_icon_body.visible = transfer_mode
		browser_icon_body.modulate.a = clawd_icon_alpha
	if browser_icon_eyes:
		browser_icon_eyes.visible = transfer_mode
		browser_icon_eyes.modulate.a = clawd_icon_alpha
	if browser_icon_skill:
		browser_icon_skill.visible = transfer_mode
		browser_icon_skill.modulate.a = clawd_icon_alpha
	if browser_icon_flash:
		browser_icon_flash.visible = transfer_mode
		browser_icon_flash.modulate.a = (0.18 + absf(sin(Time.get_ticks_msec() * 0.012)) * 0.24) if mode == "transfer_complete" or elapsed > 0.92 else 0.0
	if browser_status_label:
		browser_status_label.visible = transfer_mode
	if browser_ping_label:
		browser_ping_label.visible = transfer_mode
	if browser_hand_shape:
		browser_hand_shape.visible = mode == "transfer" or mode == "browser_unbound"
	if browser_hand_shadow:
		browser_hand_shadow.visible = mode == "transfer" or mode == "browser_unbound"
	if browser_hand_placeholder:
		browser_hand_placeholder.visible = mode == "browser_unbound"
	if browser_recovery_slot:
		browser_recovery_slot.visible = recovery_mode
	if browser_recovery_title_label:
		browser_recovery_title_label.visible = recovery_mode
	if browser_recovery_detail_label:
		browser_recovery_detail_label.visible = recovery_mode
	if browser_recovery_note_label:
		browser_recovery_note_label.visible = recovery_mode
	if browser_recovery_code_label:
		browser_recovery_code_label.visible = recovery_mode and _browser_recovery_code_copy(mode) != ""
	if browser_recovery_action_plate:
		browser_recovery_action_plate.visible = recovery_mode
	if browser_recovery_action_label:
		browser_recovery_action_label.visible = recovery_mode
	if browser_recovery_indicator:
		browser_recovery_indicator.visible = recovery_mode
	if browser_recovery_feedback_label:
		browser_recovery_feedback_label.visible = recovery_mode and recovery_feedback.strip_edges() != ""
	var show_reset := recovery_mode and mode == "browser_unbound" and _browser_reset_available()
	if browser_recovery_reset_plate:
		browser_recovery_reset_plate.visible = show_reset
	if browser_recovery_reset_label:
		browser_recovery_reset_label.visible = show_reset
	if browser_key_input:
		browser_key_input.visible = recovery_mode and mode == "key_missing"
		if not browser_key_input.visible:
			browser_key_input.release_focus()
	if recovery_mode:
		var recovery_title := "HAND DOCK"
		var recovery_detail := _browser_detail_copy(mode)
		var recovery_action := _browser_recovery_action_copy(mode)
		var recovery_note := _browser_recovery_note_copy(mode)
		var recovery_code := _browser_recovery_code_copy(mode)
		var recovery_color := Color("#d6a841")
		match mode:
			"daemon_offline":
				recovery_title = "DAEMON OFFLINE"
				recovery_color = Color("#d46a5c")
			"key_missing":
				recovery_title = "KEY SLOT"
				recovery_color = Color("#d46a5c")
			"browser_unbound":
				recovery_title = "HAND DOCK"
				recovery_color = Color("#d6a841")
		if browser_recovery_title_label:
			browser_recovery_title_label.text = recovery_title
		if browser_recovery_detail_label:
			browser_recovery_detail_label.text = recovery_detail
		if browser_recovery_note_label:
			browser_recovery_note_label.text = recovery_note
		if browser_recovery_code_label:
			browser_recovery_code_label.text = recovery_code
			browser_recovery_code_label.add_theme_color_override("font_color", Color("#fff0b1"))
		if browser_recovery_action_label:
			browser_recovery_action_label.text = recovery_action
		if browser_recovery_indicator:
			browser_recovery_indicator.color = recovery_color
		if browser_recovery_action_plate:
			browser_recovery_action_plate.modulate = recovery_color.lerp(Color("#ffffff"), 0.42)
		if browser_recovery_action_button:
			browser_recovery_action_button.disabled = action_request_kind != "" or (mode == "daemon_offline" and setup_request_pending) or (mode == "key_missing" and browser_key_input and browser_key_input.text.strip_edges() == "")
		if browser_recovery_reset_plate:
			browser_recovery_reset_plate.modulate = Color("#d7c999") if show_reset and action_request_kind != "pair_reset" else Color("#8a7a67")
		if browser_recovery_reset_button:
			browser_recovery_reset_button.disabled = not show_reset or action_request_kind != ""
		if browser_recovery_reset_label:
			browser_recovery_reset_label.text = "RESETTING" if action_request_kind == "pair_reset" else "RESET PAIR"
			browser_recovery_reset_label.add_theme_color_override("font_color", Color("#23170f") if show_reset else Color("#7b6a54"))
		if browser_recovery_feedback_label:
			browser_recovery_feedback_label.text = recovery_feedback
			browser_recovery_feedback_label.add_theme_color_override("font_color", Color("#f3b2a2") if recovery_feedback_is_error else Color("#dff7aa"))
		if browser_key_input:
			browser_key_input.editable = action_request_kind != "key_save"
			browser_key_input.placeholder_text = "paste OpenAI key"
	else:
		if browser_recovery_action_button:
			browser_recovery_action_button.disabled = false

func _add_browser_hand_polygon(node_name: String, points: PackedVector2Array, color: Color) -> Polygon2D:
	var polygon := Polygon2D.new()
	polygon.name = node_name
	polygon.polygon = points
	polygon.color = color
	add_child(polygon)
	return polygon

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
		[Vector2(272, 692), Vector2(266, 681), "KEY READY"],
		[Vector2(480, 692), Vector2(474, 681), "HAND WAIT"],
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

func _build_setup_console() -> void:
	setup_console_panel = _add_texture("scene.bottom-card", Vector2(24, 552), Vector2(356, 106), "SporeBiosConsole")
	setup_console_title_label = _add_label("SPORE BIOS", Vector2(52, 564), Vector2(116, 18), 13, Color("#23170f"), HORIZONTAL_ALIGNMENT_LEFT)
	setup_console_detail_label = _add_label("local-first first boot", Vector2(174, 564), Vector2(174, 18), 10, Color("#5f4b34"), HORIZONTAL_ALIGNMENT_RIGHT)

	var meter_track := ColorRect.new()
	meter_track.name = "SporeBiosMeterTrack"
	meter_track.color = Color("#2a2219")
	meter_track.position = Vector2(52, 586)
	meter_track.size = Vector2(296, 5)
	add_child(meter_track)

	setup_console_meter_fill = ColorRect.new()
	setup_console_meter_fill.name = "SporeBiosMeterFill"
	setup_console_meter_fill.color = Color("#d7c18a")
	setup_console_meter_fill.position = Vector2(52, 586)
	setup_console_meter_fill.size = Vector2(1, 5)
	add_child(setup_console_meter_fill)

	for index in range(SYSTEM_CHECKS.size()):
		var column := int(index / 4)
		var row := index % 4
		var x := 52 + column * 152
		var y := 600 + row * 14
		var led := _add_dot(Vector2(x, y + 3), Color("#3b352d"), "SporeBiosLed%s" % index)
		led.size = Vector2(8, 8)
		setup_console_leds.append(led)
		var label := _add_label("%s  WAIT" % str(SYSTEM_CHECKS[index]["label"]), Vector2(x + 14, y), Vector2(136, 14), 9, Color("#5f4b34"), HORIZONTAL_ALIGNMENT_LEFT)
		setup_console_labels.append(label)

func _update_motion() -> void:
	var bob := sin(Time.get_ticks_msec() * 0.004) * 4.0
	var browser_mode := _browser_mode()
	if spore_seed and spore_seed.visible:
		spore_seed.rotation = sin(Time.get_ticks_msec() * 0.003) * 0.05
		spore_seed.position.y = 262.0 + bob
	if bot_body and bot_body.visible:
		var snap := sin(clamp(elapsed / 0.34, 0.0, 1.0) * PI) * 0.055
		var stamp_reaction := 0.0
		var browser_shift_x := 0.0
		var browser_shift_y := 0.0
		var browser_tilt := 0.0
		if _current_step_id() == "stamp":
			stamp_reaction = sin(clamp(elapsed / 0.46, 0.0, 1.0) * PI) * 0.16
		elif _current_step_id() == "browser":
			match browser_mode:
				"transfer":
					var focus := smoothstep(0.14, 0.54, elapsed)
					var settle := sin(clamp((elapsed - 0.92) / 0.26, 0.0, 1.0) * PI) * 0.09
					browser_shift_x = focus * 10.0
					browser_tilt = focus * 0.08
					stamp_reaction = settle
				"browser_unbound":
					browser_shift_x = 6.0
					browser_tilt = 0.04
				"key_missing":
					browser_shift_x = 3.0
					browser_tilt = 0.02
				"daemon_offline":
					browser_shift_y = 12.0
					browser_tilt = -0.06
					stamp_reaction = -0.04
		bot_body.position = Vector2(506.0 + browser_shift_x, 224.0 + bob + browser_shift_y)
		bot_body.scale = Vector2(1.0 + snap + stamp_reaction, 1.0 - snap * 0.7 - stamp_reaction * 0.55)
		bot_body.rotation = browser_tilt
	if eye_panel and eye_panel.visible:
		var blink := _current_step_id() == "eye" and int(Time.get_ticks_msec() * 0.012) % 18 == 0
		if _current_step_id() == "browser":
			blink = (browser_mode == "transfer" and elapsed > 0.94 and elapsed < 1.08) or (browser_mode == "daemon_offline" and int(Time.get_ticks_msec() * 0.008) % 20 < 2)
		eye_panel.scale.y = 0.18 if blink else 1.0
	if bench_glow:
		if _current_step_id() == "browser" and browser_mode == "daemon_offline":
			bench_glow.color = Color(0.76, 0.28, 0.18, 0.05 + abs(sin(Time.get_ticks_msec() * 0.003)) * 0.03)
		else:
			bench_glow.color = Color(1.0, 0.76, 0.34, 0.07 + abs(sin(Time.get_ticks_msec() * 0.004)) * 0.08)
	if stamp_label:
		stamp_label.modulate.a = 0.72 + abs(sin(Time.get_ticks_msec() * 0.006)) * 0.28
	if account_avatar_seed and account_avatar_seed.visible:
		account_avatar_seed.scale = Vector2.ONE * (1.0 + absf(sin(Time.get_ticks_msec() * 0.006)) * 0.035)
	if account_action_plate and account_action_plate.visible and _account_mode() != "signed_in":
		account_action_plate.scale = Vector2.ONE * (1.0 + absf(sin(Time.get_ticks_msec() * 0.007)) * 0.025)
	for index in range(setup_console_leds.size()):
		var check: Dictionary = SYSTEM_CHECKS[index]
		if int(check["ready_at"]) == step_index:
			setup_console_leds[index].modulate.a = 0.62 + absf(sin(Time.get_ticks_msec() * 0.010 + index)) * 0.34
		else:
			setup_console_leds[index].modulate.a = 0.88
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
	var mode := _browser_mode()
	if mode == "":
		return

	_sync_browser_transfer_visuals()
	var card_home := Vector2(698, 188)
	var card_focus := Vector2(682, 174)
	var toolbar_home := Vector2(742, 280)
	var toolbar_focus := Vector2(734, 266)
	var hand_start := Vector2(1080, 164)
	var hand_target := Vector2(686, 368)
	var hand_exit := Vector2(962, 126)
	var shadow_start := hand_start + Vector2(8, 18)
	var shadow_target := hand_target + Vector2(12, 18)
	var palm_body := Vector2(584, 262)
	var palm_eyes := Vector2(620, 320)
	var palm_skill := Vector2(587, 321)
	var body_target := Vector2(816, 270)
	var eyes_target := Vector2(854, 327)
	var skill_target := Vector2(822, 328)

	if browser_card:
		browser_card.modulate = Color.WHITE
		browser_card.position = card_home
		browser_card.scale = Vector2.ONE
	if browser_toolbar_slot:
		browser_toolbar_slot.position = toolbar_home
		browser_toolbar_slot.scale = Vector2.ONE
	if browser_cable:
		browser_cable.position = Vector2(646, 326)
		browser_cable.size = Vector2(246, 34)
	if browser_icon_body:
		browser_icon_body.position = body_target
		browser_icon_body.scale = Vector2.ONE
	if browser_icon_eyes:
		browser_icon_eyes.position = eyes_target
		browser_icon_eyes.scale = Vector2.ONE
	if browser_icon_skill:
		browser_icon_skill.position = skill_target
		browser_icon_skill.scale = Vector2.ONE
	if browser_default_icon:
		browser_default_icon.scale = Vector2.ONE
	if browser_default_eye_l:
		browser_default_eye_l.scale = Vector2.ONE
	if browser_default_eye_r:
		browser_default_eye_r.scale = Vector2.ONE
	if browser_hand_shape:
		browser_hand_shape.position = hand_target
		browser_hand_shape.scale = Vector2.ONE
		browser_hand_shape.rotation = 0.08
	if browser_hand_shadow:
		browser_hand_shadow.position = shadow_target
		browser_hand_shadow.scale = Vector2.ONE
		browser_hand_shadow.rotation = 0.06
	if browser_hand_placeholder:
		browser_hand_placeholder.position = Vector2(666, 308)
		browser_hand_placeholder.scale = Vector2.ONE
	if browser_recovery_slot:
		browser_recovery_slot.position = Vector2(764, 290)
		browser_recovery_slot.scale = Vector2.ONE
	if browser_recovery_note_label:
		browser_recovery_note_label.position = Vector2(772, 354)
		browser_recovery_note_label.scale = Vector2.ONE
	if browser_recovery_code_label:
		browser_recovery_code_label.position = Vector2(772, 374)
		browser_recovery_code_label.scale = Vector2.ONE
	if browser_key_input:
		browser_key_input.position = Vector2(754, 372)
		browser_key_input.scale = Vector2.ONE
	if browser_recovery_action_plate:
		browser_recovery_action_plate.position = Vector2(742, 410)
		browser_recovery_action_plate.scale = Vector2.ONE
	if browser_recovery_indicator:
		browser_recovery_indicator.position = Vector2(778, 431)
		browser_recovery_indicator.scale = Vector2.ONE
	if browser_recovery_feedback_label:
		browser_recovery_feedback_label.position = Vector2(746, 470)
		browser_recovery_feedback_label.scale = Vector2.ONE
	if browser_recovery_reset_plate:
		browser_recovery_reset_plate.position = Vector2(808, 492)
		browser_recovery_reset_plate.scale = Vector2.ONE
	if browser_recovery_reset_label:
		browser_recovery_reset_label.position = Vector2(822, 496)
		browser_recovery_reset_label.scale = Vector2.ONE

	match mode:
		"transfer":
			var dock_focus := smoothstep(0.04, 0.24, elapsed)
			var hand_in := smoothstep(0.12, 0.42, elapsed)
			var launch := smoothstep(0.52, 0.94, elapsed)
			var settle := sin(clamp((elapsed - 0.92) / 0.26, 0.0, 1.0) * PI)
			var hand_out := smoothstep(1.10, 1.42, elapsed)
			if browser_card:
				browser_card.position = card_home.lerp(card_focus, dock_focus)
				browser_card.scale = Vector2.ONE * (1.0 + dock_focus * 0.045 - hand_out * 0.02)
			if browser_toolbar_slot:
				browser_toolbar_slot.position = toolbar_home.lerp(toolbar_focus, dock_focus)
				browser_toolbar_slot.scale = Vector2.ONE * (1.0 + dock_focus * 0.03)
			if browser_cable:
				var link_pulse := absf(sin(Time.get_ticks_msec() * 0.010))
				browser_cable.position = Vector2(626, 324).lerp(Vector2(646, 326), dock_focus)
				browser_cable.size = Vector2(96 + dock_focus * 150.0 + link_pulse * 18.0, 34)
				browser_cable.modulate.a = 0.20 + dock_focus * 0.52
			if browser_hand_shape:
				browser_hand_shape.position = hand_start.lerp(hand_target, hand_in).lerp(hand_exit, hand_out)
				browser_hand_shape.scale = Vector2.ONE * (0.82 + hand_in * 0.18 - hand_out * 0.04)
				browser_hand_shape.rotation = lerpf(-0.44, 0.10, hand_in) - hand_out * 0.22
			if browser_hand_shadow:
				browser_hand_shadow.position = shadow_start.lerp(shadow_target, hand_in).lerp(hand_exit + Vector2(16, 18), hand_out)
				browser_hand_shadow.scale = Vector2.ONE * (0.82 + hand_in * 0.18 - hand_out * 0.04)
				browser_hand_shadow.rotation = lerpf(-0.32, 0.06, hand_in) - hand_out * 0.18
			if browser_icon_body:
				browser_icon_body.position = palm_body.lerp(body_target, launch)
				browser_icon_body.scale = Vector2.ONE * (0.82 + launch * 0.10 + settle * 0.12)
			if browser_icon_eyes:
				browser_icon_eyes.position = palm_eyes.lerp(eyes_target, launch)
				browser_icon_eyes.scale = Vector2.ONE * (0.88 + launch * 0.08 + settle * 0.04)
			if browser_icon_skill:
				browser_icon_skill.position = palm_skill.lerp(skill_target, launch)
				browser_icon_skill.scale = Vector2.ONE * (0.84 + launch * 0.10 + settle * 0.07)
			if browser_default_icon:
				browser_default_icon.scale = Vector2.ONE * (1.0 - smoothstep(0.54, 0.86, elapsed) * 0.28)
			if browser_default_eye_l:
				browser_default_eye_l.scale = browser_default_icon.scale
			if browser_default_eye_r:
				browser_default_eye_r.scale = browser_default_icon.scale
			if browser_ping_label:
				browser_ping_label.modulate.a = 0.72 + absf(sin(Time.get_ticks_msec() * 0.009)) * 0.28
		"transfer_complete":
			if browser_card:
				browser_card.position = card_home.lerp(card_focus, 0.65)
				browser_card.scale = Vector2.ONE * 1.03
			if browser_toolbar_slot:
				browser_toolbar_slot.position = toolbar_home.lerp(toolbar_focus, 0.65)
				browser_toolbar_slot.scale = Vector2.ONE * 1.02
			if browser_cable:
				var ready_pulse := absf(sin(Time.get_ticks_msec() * 0.008))
				browser_cable.position = Vector2(642, 326)
				browser_cable.size = Vector2(224 + ready_pulse * 18.0, 34)
				browser_cable.modulate.a = 0.42 + ready_pulse * 0.16
			if browser_icon_body:
				var icon_pulse := absf(sin(Time.get_ticks_msec() * 0.010)) * 0.06
				browser_icon_body.scale = Vector2.ONE * (1.0 + icon_pulse)
			if browser_icon_skill:
				browser_icon_skill.scale = Vector2.ONE * (1.0 + absf(sin(Time.get_ticks_msec() * 0.012)) * 0.04)
		"browser_unbound":
			var hand_pulse := absf(sin(Time.get_ticks_msec() * 0.009))
			if browser_card:
				browser_card.position = card_home
				browser_card.scale = Vector2.ONE * (1.0 + hand_pulse * 0.02)
			if browser_hand_shape:
				browser_hand_shape.position = hand_target + Vector2(0.0, sin(Time.get_ticks_msec() * 0.004) * 4.0)
				browser_hand_shape.scale = Vector2.ONE * (1.0 + hand_pulse * 0.03)
				browser_hand_shape.rotation = 0.08 + sin(Time.get_ticks_msec() * 0.003) * 0.02
			if browser_hand_shadow:
				browser_hand_shadow.position = shadow_target + Vector2(0.0, sin(Time.get_ticks_msec() * 0.004) * 3.0)
				browser_hand_shadow.scale = Vector2.ONE * (1.0 + hand_pulse * 0.02)
			if browser_hand_placeholder:
				browser_hand_placeholder.scale = Vector2.ONE * (1.0 + hand_pulse * 0.16)
				browser_hand_placeholder.color = Color(0.94, 0.88, 0.72, 0.68 + hand_pulse * 0.28)
			if browser_recovery_code_label and _browser_pairing_ready():
				browser_recovery_code_label.scale = Vector2.ONE * (1.0 + hand_pulse * 0.03)
			if browser_recovery_action_plate:
				browser_recovery_action_plate.scale = Vector2.ONE * (1.0 + hand_pulse * 0.03)
			if browser_recovery_reset_plate and _browser_reset_available():
				browser_recovery_reset_plate.scale = Vector2.ONE * (1.0 + hand_pulse * 0.02)
		"key_missing":
			var slot_pulse := absf(sin(Time.get_ticks_msec() * 0.007))
			if browser_card:
				browser_card.position = card_home + Vector2(0.0, 6.0)
				browser_card.scale = Vector2.ONE * 0.99
			if browser_recovery_slot:
				browser_recovery_slot.scale = Vector2.ONE * (1.0 + slot_pulse * 0.03)
			if browser_key_input:
				browser_key_input.position = Vector2(754, 372) + Vector2(0.0, sin(Time.get_ticks_msec() * 0.003) * 2.0)
			if browser_recovery_action_plate:
				browser_recovery_action_plate.scale = Vector2.ONE * (1.0 + slot_pulse * 0.025)
			if browser_recovery_indicator:
				browser_recovery_indicator.scale = Vector2.ONE * (1.0 + slot_pulse * 0.12)
		"daemon_offline":
			var low_pulse := absf(sin(Time.get_ticks_msec() * 0.004))
			if browser_card:
				browser_card.position = card_home + Vector2(0.0, 12.0)
				browser_card.scale = Vector2.ONE * 0.98
				browser_card.modulate = Color(0.82, 0.78, 0.72, 0.92)
			if browser_recovery_slot:
				browser_recovery_slot.position = Vector2(764, 296)
				browser_recovery_slot.scale = Vector2.ONE * (0.98 + low_pulse * 0.015)
			if browser_recovery_note_label:
				browser_recovery_note_label.position = Vector2(772, 360)
			if browser_recovery_action_plate:
				browser_recovery_action_plate.position = Vector2(742, 418)
				browser_recovery_action_plate.scale = Vector2.ONE * (0.98 + low_pulse * 0.02)
			if browser_recovery_indicator:
				browser_recovery_indicator.scale = Vector2.ONE * (0.94 + low_pulse * 0.06)
			if browser_recovery_feedback_label:
				browser_recovery_feedback_label.position = Vector2(746, 476)
			if browser_recovery_reset_plate:
				browser_recovery_reset_plate.position = Vector2(808, 498)

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

func _make_recovery_field_stylebox(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.border_width_left = 2
	style.border_width_top = 2
	style.border_width_right = 2
	style.border_width_bottom = 2
	style.set_corner_radius_all(4)
	style.content_margin_left = 8
	style.content_margin_right = 8
	style.content_margin_top = 4
	style.content_margin_bottom = 4
	return style

func _on_account_provider_pressed(index: int) -> void:
	_select_account_provider(index)
	_trigger_account_action(str(ACCOUNT_PROVIDERS[selected_account_provider_index]["id"]))

func _on_account_action_pressed() -> void:
	_trigger_account_action()

func _on_browser_recovery_action_pressed() -> void:
	_trigger_browser_recovery_action()

func _on_browser_recovery_reset_pressed() -> void:
	_reset_browser_pairing()

func _on_browser_key_changed(_new_text: String) -> void:
	if _current_step_id() != "browser":
		return
	_sync_browser_transfer_visuals()

func _on_browser_key_submitted(_new_text: String) -> void:
	_save_openai_key()

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
