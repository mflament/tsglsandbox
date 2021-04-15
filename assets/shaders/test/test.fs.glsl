#version 300 es
precision mediump float;

uniform float seconds;
uniform vec2 viewportSize;
uniform sampler2D u_sampler;

in vec2 texcoord;
out vec4 color;

void main() {
  // color = vec4(texcoord.x, texcoord.y, 0.0, 1.0);
  color = texture(u_sampler, vec2(texcoord.x, 1.0 - texcoord.y));
  // float blue = (sin(seconds * 1.5) + 1.0) / 2.0;
  // color = vec4(gl_FragCoord.x / viewportSize.x,
  //              1.0 - (gl_FragCoord.y / viewportSize.y), blue, 0.0);
}