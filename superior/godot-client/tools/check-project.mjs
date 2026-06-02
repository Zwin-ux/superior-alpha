import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "project.godot",
  "scenes/Boot.tscn",
  "scenes/Onboarding.tscn",
  "scenes/SporeGarden.tscn",
  "scenes/ClayWorkshop.tscn",
  "scenes/SignalRoom.tscn",
  "scripts/boot_controller.gd",
  "scripts/onboarding_controller.gd",
  "scripts/spore_garden.gd",
  "scripts/clay_workshop.gd",
  "scripts/sfx_player.gd",
  "scripts/realtime_client.gd",
  "scripts/signal_room.gd",
  "shaders/crt_pixel_pass.gdshader",
  "assets/clay/superior-clay-atlas.png",
  "assets/clay/superior-clay-atlas.json",
  "assets/clay/superior-clay-factory-atlas.png",
  "assets/clay/superior-clay-factory-atlas.json"
];

for (const file of requiredFiles) {
  const fullPath = path.join(projectRoot, file);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing Godot client file: ${file}`);
  }
}

const projectConfig = readFileSync(path.join(projectRoot, "project.godot"), "utf8");
if (!projectConfig.includes('run/main_scene="res://scenes/Boot.tscn"')) {
  throw new Error("Godot project must boot through scenes/Boot.tscn.");
}

const workshopScript = readFileSync(path.join(projectRoot, "scripts/clay_workshop.gd"), "utf8");
const onboardingScript = readFileSync(path.join(projectRoot, "scripts/onboarding_controller.gd"), "utf8");
const gardenScript = readFileSync(path.join(projectRoot, "scripts/spore_garden.gd"), "utf8");
const clientScript = readFileSync(path.join(projectRoot, "scripts/realtime_client.gd"), "utf8");
const bootScript = readFileSync(path.join(projectRoot, "scripts/boot_controller.gd"), "utf8");
const sfxScript = readFileSync(path.join(projectRoot, "scripts/sfx_player.gd"), "utf8");
const shaderSource = readFileSync(path.join(projectRoot, "shaders/crt_pixel_pass.gdshader"), "utf8");
for (const token of ["ClayWorkshop", "ClawdGremlin", "send_signal", "CRTPixelPass", "KEY_1", "KEY_2", "KEY_3", "clay_atlas", "superior-clay-factory-atlas.json", "scene.left-rail", "bot.clawd.body"]) {
  if (!workshopScript.includes(token)) {
    throw new Error(`Godot clay workshop is missing expected token: ${token}`);
  }
}
if (!clientScript.includes("WebSocketPeer")) {
  throw new Error("Godot realtime client must use WebSocketPeer.");
}
for (const token of ["mock_events", "_tick_mock_feed", "_emit_mock_signal"]) {
  if (!clientScript.includes(token)) {
    throw new Error(`Godot realtime client is missing mock fallback token: ${token}`);
  }
}
for (const token of ["BOOT_DURATION", "AudioStreamGenerator", "boot.seed", "boot.wordmark", "BootProgressPip", "Onboarding.tscn", "ClayWorkshop.tscn"]) {
  if (!bootScript.includes(token)) {
    throw new Error(`Boot controller is missing expected token: ${token}`);
  }
}
for (const token of ["REGISTER", "Local Ollama", "OpenAI BYOK", "CHROME HAND", "CLAWD", "SAVE SPORE", "SporeGarden.tscn", "superior-setup-complete.flag"]) {
  if (!onboardingScript.includes(token)) {
    throw new Error(`Onboarding controller is missing expected token: ${token}`);
  }
}
for (const token of ["SporeGarden", "BUILDER RACE", "SCOUT RACE", "SENTINEL RACE", "KEY_1", "KEY_2", "KEY_3", "ClayWorkshop.tscn", "SporeGardenCRTPixelPass"]) {
  if (!gardenScript.includes(token)) {
    throw new Error(`Spore garden is missing expected token: ${token}`);
  }
}
for (const token of ["SuperiorSfxPlayer", "AudioStreamGenerator", "play_sfx", "browser_bind", "stamp", "equip", "signal"]) {
  if (!sfxScript.includes(token)) {
    throw new Error(`Godot SFX player is missing expected token: ${token}`);
  }
}
for (const token of ["scanline_strength", "dither_strength", "low_res_scale", "hint_screen_texture"]) {
  if (!shaderSource.includes(token)) {
    throw new Error(`CRT shader is missing expected token: ${token}`);
  }
}

console.log("SUPERIOR Godot client scaffold is valid.");
