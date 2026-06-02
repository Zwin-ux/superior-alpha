extends AudioStreamPlayer
class_name SuperiorSfxPlayer

const SAMPLE_RATE := 22050.0

var playback: AudioStreamGeneratorPlayback
var active_events: Array[Dictionary] = []

func _ready() -> void:
	var generator := AudioStreamGenerator.new()
	generator.mix_rate = SAMPLE_RATE
	generator.buffer_length = 0.14
	stream = generator
	volume_db = -7.0
	play()
	playback = get_stream_playback()

func _process(_delta: float) -> void:
	_fill_buffer()

func play_sfx(kind: String, gain: float = 1.0) -> void:
	active_events.append({
		"kind": kind,
		"age": 0.0,
		"duration": _duration_for(kind),
		"gain": gain
	})

func _fill_buffer() -> void:
	if not playback:
		return

	var frames_available: int = min(playback.get_frames_available(), 1024)
	for _frame in range(frames_available):
		var sample := 0.0
		var still_active: Array[Dictionary] = []
		for event in active_events:
			var kind := str(event.get("kind", "tap"))
			var age := float(event.get("age", 0.0))
			var duration := float(event.get("duration", 0.12))
			var gain := float(event.get("gain", 1.0))
			sample += _sample_event(kind, age, duration) * gain
			age += 1.0 / SAMPLE_RATE
			event["age"] = age
			if age < duration:
				still_active.append(event)
		active_events = still_active
		sample = clamp(sample, -0.38, 0.38)
		playback.push_frame(Vector2(sample, sample))

func _duration_for(kind: String) -> float:
	match kind:
		"boot_wake":
			return 0.72
		"step":
			return 0.14
		"select":
			return 0.18
		"attach":
			return 0.28
		"browser_bind":
			return 0.74
		"stamp":
			return 0.62
		"success":
			return 0.42
		"play":
			return 0.34
		"equip":
			return 0.32
		"signal":
			return 0.58
		"repo":
			return 0.48
		"error":
			return 0.34
		_:
			return 0.16

func _sample_event(kind: String, time: float, duration: float) -> float:
	match kind:
		"boot_wake":
			return _tone(time, 0.00, 360.0, 0.11, 0.10) + _tone(time, 0.18, 520.0, 0.10, 0.09) + _tone(time, 0.42, 760.0, 0.16, 0.07)
		"step":
			return _clay_noise(time, duration, 0.10) + _tone(time, 0.01, 180.0, 0.08, 0.07)
		"select":
			return _tone(time, 0.00, 520.0, 0.08, 0.08) + _tone(time, 0.06, 740.0, 0.08, 0.06)
		"attach":
			return _clay_noise(time, 0.16, 0.11) + _tone(time, 0.02, 260.0, 0.12, 0.10) + _tone(time, 0.11, 820.0, 0.07, 0.05)
		"browser_bind":
			return _tone(time, 0.00, 420.0, 0.12, 0.07) + _tone(time, 0.17, 560.0, 0.13, 0.08) + _tone(time, 0.36, 760.0, 0.18, 0.09) + _soft_hum(time, duration, 72.0, 0.06)
		"stamp":
			return _clay_noise(time, 0.28, 0.16) + _tone(time, 0.00, 94.0, 0.26, 0.18) + _tone(time, 0.18, 190.0, 0.13, 0.06)
		"success":
			return _tone(time, 0.00, 660.0, 0.12, 0.08) + _tone(time, 0.16, 990.0, 0.16, 0.07)
		"play":
			return _tone(time, 0.00, 480.0, 0.12, 0.08) + _tone(time, 0.10, 680.0, 0.16, 0.08)
		"equip":
			return _clay_noise(time, 0.14, 0.11) + _tone(time, 0.06, 720.0, 0.12, 0.07)
		"signal":
			return _tone_sweep(time, 0.00, 320.0, 760.0, 0.36, 0.08) + _soft_hum(time, duration, 118.0, 0.06)
		"repo":
			return _tone(time, 0.00, 220.0, 0.09, 0.07) + _tone(time, 0.12, 330.0, 0.10, 0.08) + _clay_noise(time, 0.24, 0.07)
		"error":
			return _tone(time, 0.00, 190.0, 0.12, 0.10) + _tone(time, 0.12, 145.0, 0.14, 0.08)
		_:
			return _tone(time, 0.00, 360.0, min(duration, 0.12), 0.06)

func _tone(time: float, start: float, frequency: float, duration: float, gain: float) -> float:
	if time < start or time > start + duration:
		return 0.0
	var local_time := time - start
	var envelope := sin((local_time / duration) * PI)
	return sin(local_time * frequency * TAU) * envelope * gain

func _tone_sweep(time: float, start: float, from_frequency: float, to_frequency: float, duration: float, gain: float) -> float:
	if time < start or time > start + duration:
		return 0.0
	var local_time := time - start
	var progress: float = clamp(local_time / duration, 0.0, 1.0)
	var frequency: float = lerp(from_frequency, to_frequency, progress)
	var envelope := sin(progress * PI)
	return sin(local_time * frequency * TAU) * envelope * gain

func _soft_hum(time: float, duration: float, frequency: float, gain: float) -> float:
	if time > duration:
		return 0.0
	var envelope := sin(clamp(time / duration, 0.0, 1.0) * PI)
	return sin(time * frequency * TAU) * envelope * gain

func _clay_noise(time: float, duration: float, gain: float) -> float:
	if time > duration:
		return 0.0
	var progress: float = clamp(time / duration, 0.0, 1.0)
	var envelope := pow(1.0 - progress, 2.0)
	return _noise(time) * envelope * gain

func _noise(time: float) -> float:
	var value := sin((time * SAMPLE_RATE + 11.0) * 12.9898) * 43758.5453
	return fposmod(value, 1.0) * 2.0 - 1.0
