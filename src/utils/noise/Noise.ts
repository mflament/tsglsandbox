import { vec2, vec3, vec4 } from 'gl-matrix';

export type NoiseDimension = number | vec2 | vec3 | vec4;

export type Noise<T extends NoiseDimension = vec2> = (x: T) => number;
