precision mediump float;

// in vs

// vertex attributes
layout(location = 0) in vec2 a_vertexPos;
layout(location = 1) in vec2 a_vertexUV;

// sprite attributes (4 location for mat4 : 2,3,4,5)
layout(location = 2) in mat4 a_spriteMatrix;
// x: animationStartTime (0 if not running), y : startFrame:int(region index), z
// : endFrame:int(region index), w: duration in seconds
layout(location = 6) in vec4 a_texture;

uniform mat4 u_viewMatrix;
uniform float u_time;
layout(std140) uniform u_regions {
    ivec4 textures[REGIONS_COUNT];
    vec4 regions[REGIONS_COUNT];
};

out vec2 spriteUV;
flat out int regionIndex;
flat out int textureIndex;
out vec2 textureUV;

void main() {
    gl_Position = u_viewMatrix * a_spriteMatrix * vec4(a_vertexPos, 0.0, 1.0);
    spriteUV = a_vertexUV;
    float startTime = a_texture.x;
    if (startTime < 0.0) {
        regionIndex = int(a_texture.y);
    } else {
        float elapsed = u_time - startTime;
        float a = mod(elapsed, a_texture.w) / a_texture.w;
        regionIndex = int(mix(a_texture.y, a_texture.z, a));
    }
    vec4 region = regions[regionIndex];
    textureUV = region.xy + spriteUV * region.zw;
    textureIndex = textures[regionIndex].x;
}

// in fs
in vec2 spriteUV;
in vec2 textureUV;
flat in int regionIndex;
flat in int textureIndex;

uniform sampler2D u_textures[TEXTURES_COUNT];

out vec4 color;

void main() {
    color = texture(u_textures[textureIndex], textureUV);
}

//    switch (textureIndex) {
//        /** unroll(TEXTURES_COUNT)
//        case 0:
//        color = texture(u_textures[0], textureUV);
//        break;
//        case 1:
//        color = texture(u_textures[1], textureUV);
//        break;
//        case 2:
//        color = texture(u_textures[2], textureUV);
//        break;
//        case 3:
//        color = texture(u_textures[3], textureUV);
//        break;
//        case 4:
//        color = texture(u_textures[4], textureUV);
//        break;
//        case 5:
//        color = texture(u_textures[5], textureUV);
//        break;
//        case 6:
//        color = texture(u_textures[6], textureUV);
//        break;
//        case 7:
//        color = texture(u_textures[7], textureUV);
//        break;
//        case 8:
//        color = texture(u_textures[8], textureUV);
//        break;
//        case 9:
//        color = texture(u_textures[9], textureUV);
//        break;
//        default :
//        color = vec4(1.0, 0.0, 1.0, 1.0);
//        break;
//    }
