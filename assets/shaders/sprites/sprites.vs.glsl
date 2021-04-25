#version 300 es
precision mediump float;

// vertex attributes
in vec2 a_vertexPos;
in vec2 a_vertexUV;

// sprite attributes
in mat4 a_spriteMatrix;

uniform mat4 u_viewMatrix;

out vec2 spriteUV;

void main() {
  gl_Position = u_viewMatrix * a_spriteMatrix * vec4(a_vertexPos, 0.0, 1.0);
  spriteUV = a_vertexUV;
}