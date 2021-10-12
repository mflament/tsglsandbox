in vec3 vColor;

uniform vec3 planetColor;

void main() {
    // pc_fragColor = vec4(planetColor, 1.0);
    pc_fragColor = vec4(vColor, 1.0);
}
