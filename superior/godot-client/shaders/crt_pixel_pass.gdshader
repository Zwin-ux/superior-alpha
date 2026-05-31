shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, filter_nearest;
uniform float scanline_strength : hint_range(0.0, 1.0) = 0.16;
uniform float dither_strength : hint_range(0.0, 1.0) = 0.06;
uniform float low_res_scale : hint_range(1.0, 8.0) = 2.0;
uniform float vignette_strength : hint_range(0.0, 1.0) = 0.16;

float bayer(vec2 p) {
	int x = int(mod(p.x, 4.0));
	int y = int(mod(p.y, 4.0));
	int index = x + y * 4;
	float values[16] = float[16](
		0.0, 8.0, 2.0, 10.0,
		12.0, 4.0, 14.0, 6.0,
		3.0, 11.0, 1.0, 9.0,
		15.0, 7.0, 13.0, 5.0
	);
	return values[index] / 15.0;
}

void fragment() {
	vec2 pixel_size = SCREEN_PIXEL_SIZE * low_res_scale;
	vec2 uv = floor(SCREEN_UV / pixel_size) * pixel_size;
	vec4 color = texture(screen_texture, uv);

	float scanline = sin(SCREEN_UV.y / SCREEN_PIXEL_SIZE.y * 3.14159);
	color.rgb *= 1.0 - scanline_strength * (1.0 - scanline) * 0.5;

	float dither = bayer(FRAGCOORD.xy) - 0.5;
	color.rgb += dither * dither_strength;
	color.rgb = floor(color.rgb * 16.0) / 16.0;

	vec2 centered = SCREEN_UV * 2.0 - 1.0;
	float vignette = smoothstep(1.25, 0.28, dot(centered, centered));
	color.rgb *= mix(1.0 - vignette_strength, 1.0, vignette);

	COLOR = vec4(color.rgb, 1.0);
}
