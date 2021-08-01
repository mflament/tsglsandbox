#version 300 es

#define PI 3.141592653

#define MODE_CUBE  0
#define MODE_SPHERE  1
#define MODE_TERRAIN 2

precision mediump float;
precision mediump int;

// in vs
layout(location = 0) in vec2 inputPos;

out vec3 position;
out vec3 normal;
out vec2 uv;

uniform int mode;
uniform int resolution;
uniform ivec2 faceVertices;// resolution,  4 main faces , 2 side faces

struct FaceDirection {
    vec3 localUp;
    vec3 axisA;
    vec3 axisB;
};

const FaceDirection[] FACE_DIRECTIONS = FaceDirection[6](
    FaceDirection(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, -1.0)),
    FaceDirection(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0)),
    FaceDirection(vec3(0.0, -1.0, 0.0), vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0)),
    FaceDirection(vec3(0.0, 0.0, -1.0), vec3(1.0, 0.0, 0.0), vec3(0.0, -1.0, 0.0)),
    FaceDirection(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, -1.0), vec3(0.0, 1.0, 0.0)),
    FaceDirection(vec3(-1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0))
);

void pointOnCube(int face, in ivec2 pof) {
    vec2 pct = vec2(float(pof.x), float(pof.y));
    pct *= 1.0 / float(resolution-1);
    pct = (pct - 0.5) * 2.0;

    FaceDirection fd = FACE_DIRECTIONS[face];
    position = fd.localUp + fd.axisA * pct.x + fd.axisB * pct.y;
}

void main() {
    int faceOffset, face;
    ivec2 pof;// point on face [0..resolution-1][0..resolution-2]
    if (gl_VertexID < 4 * faceVertices.x) {
        // main faces
        face = gl_VertexID / faceVertices.x;
        faceOffset = gl_VertexID - face * faceVertices.x;
        pof.y = faceOffset / resolution;
        pof.x = faceOffset - (pof.y * resolution);
    } else {
        int bound = 4 * faceVertices.x;
        int offset = gl_VertexID - bound;
        // side faces
        face = 4 + offset / faceVertices.y;
        faceOffset = gl_VertexID - (bound + (face - 4) * faceVertices.y);
        int tmp = faceOffset / (resolution - 2);
        pof.y = 1 + tmp;
        pof.x = 1 + faceOffset - (tmp * (resolution - 2));
    }

    pointOnCube(face, pof);
    vec3 pos = normalize(position); // point on sphere
    if (mode == MODE_SPHERE) position = pos;

    normal = vec3(0.0);

    // θ = tan−1(−z/x) / θ = atan2(-z, x);
    float theta = atan(-pos.z / pos.x);
    // φ = acos(-y);
    float phi = acos(-pos.y);
    // u = (θ + π) / 2 π; v = φ / π
    uv.x = (theta + PI) / (2.0 * PI);
    uv.y = phi / PI;
}

// in fs
out vec4 color;

void main() { color = vec4(1.0); }
