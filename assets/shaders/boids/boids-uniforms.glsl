
// xy: pos , zw: heading
uniform sampler2D u_boidData;
// x: speed
uniform sampler2D u_boidSpeed;
// xy: heading
uniform sampler2D u_targetHeadings;
// xy: normalized dir to target, z: dist to target, w: 1.0 if in view, 0.0 otherwise
uniform sampler2D u_scanData;

uniform float u_time;
uniform float u_deltaTime;

uniform int u_boidCount;
uniform vec3 u_speedConfig;  // x: acceleration, y: max speed, z: turn speed
uniform vec2 u_scanConfig;   // x:  view distance, y: fov
uniform vec3 u_updateConfig; // x: repulse distance

uniform vec2 u_boidScale;
uniform vec4 u_boidColor;
