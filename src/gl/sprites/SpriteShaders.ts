import { ShaderType } from '../shader/Program';
import { Shader } from '../shader/Shader';

export function spriteVertexShader(gl: WebGL2RenderingContext, regions: number, animations: number): Shader {
  return new Shader(gl, ShaderType.VERTEX_SHADER).compile(`#version 300 es
#define REGIONS_COUNT ${regions}
#define ANIMATIONS_COUNT ${Math.max(1, animations)}

precision mediump float;

// vertex attributes
in vec2 a_vertexPos;
in vec2 a_vertexUV;

// sprite attributes
in mat4 a_spriteMatrix;
in vec2 a_animation; // x: animationStartTime (0 if not running), y : animation index or regionIndex if not running

uniform mat4 u_viewMatrix;
uniform float u_time;
layout(std140) uniform u_regions {
  ivec4 textures[REGIONS_COUNT];
  vec4 regions[REGIONS_COUNT];
  vec4 animations[ANIMATIONS_COUNT]; // x: duration, y: start region, z : frames
};

out vec2 spriteUV;
flat out int regionIndex;
flat out int textureIndex;
out vec2 textureUV;

void main() {
  gl_Position = u_viewMatrix * a_spriteMatrix * vec4(a_vertexPos, 0.0, 1.0);
  spriteUV = a_vertexUV;
  float startTime = a_animation.x;
  if (startTime > 0.0) {
    float elapsed = u_time - startTime;
    vec4 animation = animations[int(a_animation.y)];
    int frame = int(mod(elapsed, animation.x) / animation.x * animation.z);
    regionIndex = int(animation.y) + frame;
  } else {
    regionIndex = int(a_animation.y);
  }
  vec4 region = regions[regionIndex];
  textureUV = region.xy + spriteUV * region.zw;
  textureIndex = textures[regionIndex].x;
}
`);
}

export function spriteFragmentShader(gl: WebGL2RenderingContext, textures: number): Shader {
  return new Shader(gl, ShaderType.FRAGMENT_SHADER).compile(`#version 300 es
  precision mediump float;
 
  #define TEXTURES_COUNT ${textures}

  in vec2 spriteUV;
  in vec2 textureUV;
  flat in int regionIndex;
  flat in int textureIndex;

  uniform sampler2D u_textures[TEXTURES_COUNT];

  out vec4 color;

  void main() {
    switch (textureIndex) {
      ${spriteColorCases(textures)}
    }
  }
`);
}

function spriteColorCases(textures: number) {
  let s = '';
  for (let index = 0; index < textures; index++) {
    s += `case ${index}:
        color = texture(u_textures[${index}], textureUV);
        //color = vec4(textureUV, 0.0, 1.0);
        break;
     `;
  }
  return s;
}
