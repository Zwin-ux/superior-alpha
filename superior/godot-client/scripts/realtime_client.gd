extends Node

signal message_received(message: Dictionary)
signal server_status_changed(status: String)

var socket := WebSocketPeer.new()
var connected_url := ""
var reconnect_timer := 0.0
var mock_event_timer := 0.0
var mock_event_index := 0
var mock_events := [
	{"kind": "system", "label": "MOCK SERVER PATCH", "intensity": 1},
	{"kind": "browser", "label": "BROWSER HAND PULSE", "intensity": 2},
	{"kind": "repo", "label": "REPO SIGNAL DETECTED", "intensity": 1},
	{"kind": "agent", "label": "AVATAR CORE HUM", "intensity": 1},
	{"kind": "market", "label": "LANE PRESSURE RISING", "intensity": 3}
]

func connect_to_server(url: String) -> void:
	connected_url = url
	var error := socket.connect_to_url(url)
	if error != OK:
		server_status_changed.emit("offline")
	else:
		server_status_changed.emit("connecting")

func _process(delta: float) -> void:
	socket.poll()
	var state := socket.get_ready_state()

	if state == WebSocketPeer.STATE_OPEN:
		server_status_changed.emit("online")
		mock_event_timer = 0.0
		while socket.get_available_packet_count() > 0:
			var raw := socket.get_packet().get_string_from_utf8()
			var parsed = JSON.parse_string(raw)
			if typeof(parsed) == TYPE_DICTIONARY:
				message_received.emit(parsed)
		return

	if state == WebSocketPeer.STATE_CLOSED and connected_url != "":
		server_status_changed.emit("mock")
		_tick_mock_feed(delta)
		reconnect_timer += delta
		if reconnect_timer > 2.5:
			reconnect_timer = 0.0
			socket = WebSocketPeer.new()
			socket.connect_to_url(connected_url)
		return

	if state != WebSocketPeer.STATE_OPEN:
		_tick_mock_feed(delta)

func send_signal(kind: String, label: String, intensity: int = 1) -> void:
	if socket.get_ready_state() != WebSocketPeer.STATE_OPEN:
		_emit_mock_signal(kind, label, intensity)
		return

	var payload := {
		"type": "signal",
		"event": {
			"id": "godot_%s" % Time.get_ticks_msec(),
			"kind": kind,
			"label": label,
			"source": "godot",
			"intensity": intensity,
			"createdAt": Time.get_datetime_string_from_system(true)
		}
	}
	socket.send_text(JSON.stringify(payload))

func _tick_mock_feed(delta: float) -> void:
	mock_event_timer += delta
	if mock_event_timer < 1.85:
		return

	mock_event_timer = 0.0
	var item: Dictionary = mock_events[mock_event_index % mock_events.size()]
	mock_event_index += 1
	_emit_mock_signal(str(item["kind"]), str(item["label"]), int(item["intensity"]))

func _emit_mock_signal(kind: String, label: String, intensity: int = 1) -> void:
	message_received.emit({
		"type": "signal",
		"mock": true,
		"event": {
			"id": "mock_%s" % Time.get_ticks_msec(),
			"kind": kind,
			"label": label,
			"source": "fixture",
			"intensity": intensity,
			"createdAt": Time.get_datetime_string_from_system(true)
		}
	})
