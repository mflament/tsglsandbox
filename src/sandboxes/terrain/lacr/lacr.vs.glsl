uniform float gridSize, gridScale, textureScale;
uniform sampler2D uTerrain;

vec2 transformPosition(vec2 position){
    return (position / gridSize) * gridScale;
}

float getHeight(vec2 position){
    vec2 texcoord = position/textureScale;
    return texture2D(uTerrain, texcoord).x * textureScale;
}

void main() {
    vec2 pos = transformPosition(position.xy);
    float yOffset = getHeight(pos);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos.x, yOffset, pos.y, 1.0);
}
