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
out vec2 uv;

uniform ivec4 config; // x: mode, y : resolution, main face vertices , side face vertices

struct FaceDirection {
    vec3 localUp;
    vec3 axisA;
    vec3 axisB;
};

const FaceDirection[] FACE_DIRECTIONS = FaceDirection[6](
FaceDirection(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0)),
FaceDirection(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), vec3(0.0, -1.0, 0.0)),
FaceDirection(vec3(0.0, -1.0, 0.0), vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, -1.0)),
FaceDirection(vec3(0.0, 0.0, -1.0), vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0)),
FaceDirection(vec3(-1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), vec3(0.0, -1.0, 0.0)),
FaceDirection(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, -1.0), vec3(0.0, -1.0, 0.0))
);

// x: face , y : face x [0..resolution-1] , z : face y [0..resolution-2]
ivec3 pointOnFace() {
    int faceOffset, face, x, y;
    int resolution = config.y;
    int mainVertices = config.z;
    int sideVertices = config.w;
    if (gl_VertexID < 4 * mainVertices) {
        // main faces
        face = gl_VertexID / mainVertices;
        faceOffset = gl_VertexID - face * mainVertices;
        y = faceOffset / resolution;
        x = faceOffset - (y * resolution);
    } else {
        int bound = 4 * mainVertices;
        int offset = gl_VertexID - bound;
        // side faces
        face = 4 + offset / sideVertices;
        faceOffset = gl_VertexID - (bound + (face - 4) * sideVertices);
        int tmp = faceOffset / (resolution - 2);
        y = 1 + tmp;
        x = 1 + faceOffset - (tmp * (resolution - 2));
    }
    return ivec3(face, x, y);
}

vec3 pointOnCube(in ivec3 pof) {
    vec2 pct = vec2(float(pof.y), float(pof.z));
    pct *= 1.0 / float(config.y - 1);
    pct = (pct - 0.5) * 2.0;

    FaceDirection fd = FACE_DIRECTIONS[pof.x];
    return fd.localUp + fd.axisA * pct.x + fd.axisB * pct.y;
}

void main() {
    ivec3 pof = pointOnFace();
    position = pointOnCube(pof);

    vec3 pos = normalize(position);// point on sphere
    if (config.x == MODE_SPHERE) position = pos;

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
