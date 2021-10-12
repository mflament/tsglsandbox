in vec2 vPosition;

uniform float gridSize, gridScale, textureScale;
uniform sampler2D uTerrain;

vec2 getDerivatives(){
    vec2 texcoord = vPosition / textureScale;
    return texture2D(uTerrain, texcoord).yz;
}

vec3 getNormal(vec2 derivatives) {
    vec3 sDirection = vec3(1, derivatives.s, 0);
    vec3 tDirection = vec3(0, derivatives.t, 1);
    return normalize(cross(tDirection, sDirection));
}

vec3 getIncident(vec3 normal){
    float lambert = clamp(dot(normal, normalize(vec3(1, 0.5, 0))), 0.0, 1.0);
    float ambient = 0.03;
    return vec3(lambert+ambient);
}

void main() {
    vec2 derivatives = getDerivatives();
    vec3 normal = getNormal(derivatives);
    vec3 incident = getIncident(normal);
    vec3 albedo = vec3(0.0, 1.0, 0.0);
    vec3 excident = albedo * incident;
    pc_fragColor = vec4(excident, 1.0);
}
