in vec3 vNormal;

uniform vec3 planetColor;

void main() {
    // pc_fragColor = vec4(planetColor, 1.0);
    pc_fragColor = vec4((vNormal + 1.0) * 0.5, 1.0);
}
