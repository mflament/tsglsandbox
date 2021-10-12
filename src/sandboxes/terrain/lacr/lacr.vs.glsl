uniform float gridSize, gridScale, textureScale;
uniform sampler2D uTerrain;

out vec2 vPosition;

vec2 transformPosition(vec2 position){
    return (position / gridSize) * gridScale;
}

float getHeight(vec2 uv){
    return texture2D(uTerrain, uv / textureScale).x * textureScale;
}

void main() {
    vec2 pos = transformPosition(position.xy);
    vPosition = pos * 0.5 + 0.5;
    float yOffset = getHeight(vPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos.x, yOffset, pos.y, 1.0);
}
