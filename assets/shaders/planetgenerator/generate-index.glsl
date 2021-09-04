#version 300 es

precision mediump float;
precision mediump int;

// in vs
layout(location = 0) in vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}

// in fs
uniform uvec3 sizes; // x: resolution, y: textureSize, z: indexPerRow

out uint vertexIndex;

void main() {
    uint resolution = sizes.x;
    uint textureSize = sizes.y;
    uint indexPerRow = sizes.z;
    uint index = uint(gl_FragCoord.y) * sizes.y + uint(gl_FragCoord.x);
    uint indexPerFace = indexPerRow * (resolution - 1);
    uint face = index / indexPerFace;
    uint indexInFace = index %  indexPerFace;
    uint row = indexInFace / indexPerRow;
    uint indexInRow = indexInFace % indexPerRow;

    uint rowTriangles = (resolution - 1) * 2;
    uint faceTriangles = rowTriangles * (resolution - 1);
    uint planetTriangles = faceTriangles * 6;
    uint triangleIndex = getTriangleIndex(index);
    vertexIndex = index;
}
