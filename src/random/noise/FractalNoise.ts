import {vec2, vec3, vec4} from 'gl-matrix';
import {Noise, NoiseDimension} from './Noise';

export function fractalNoise(noise: Noise<number>, octaves?: number, persistence?: number): Noise<number> {
  const f: FractalEval<number> = (v, frequency) => noise(v * frequency);
  return newFractalNoise(f, octaves, persistence);
}

export function fractalNoise2D(noise: Noise<vec2>, octaves?: number, persistence?: number): Noise<vec2> {
  const out = vec2.create();
  const f: FractalEval<vec2> = (v, frequency) => noise(vec2.scale(out, v, frequency));
  return newFractalNoise(f, octaves, persistence);
}

export function fractalNoise3D(noise: Noise<vec3>, octaves?: number, persistence?: number): Noise<vec3> {
  const out = vec3.create();
  const f: FractalEval<vec3> = (v, frequency) => noise(vec3.scale(out, v, frequency));
  return newFractalNoise(f, octaves, persistence);
}

export function fractalNoise4D(noise: Noise<vec4>, octaves?: number, persistence?: number): Noise<vec4> {
  const out = vec4.create();
  const f: FractalEval<vec4> = (v, frequency) => noise(vec4.scale(out, v, frequency));
  return newFractalNoise(f, octaves, persistence);
}

type FractalEval<T extends NoiseDimension> = (v: T, frequency: number) => number;

function newFractalNoise<T extends NoiseDimension>(e: FractalEval<T>, octaves = 8, persistence = 0.3): Noise<T> {
  return (v: T) => evalFractal(v, e, octaves, persistence);
}

function evalFractal<T extends NoiseDimension>(v: T, f: FractalEval<T>, octaves: number, persistence: number): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0; // Used for normalizing result to 0.0 - 1.0
  for (let i = 0; i < octaves; i++) {
    total += f(v, frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  return total / maxValue;
}
