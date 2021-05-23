import { vec2, vec3, vec4 } from 'gl-matrix';
import { BoidsParameters } from './BoidsParameters';

const BOID_WIDTH = 2.0 / 100;
const BOID_COLOR: vec4 = [0, 1, 0, 1];

export interface Boid {
  pos: vec2;
  velocity: vec2;
  familly: number;
}

export interface BoidFamilly {
  maxSpeed: number;
  size: vec2;
  color: vec4;

  radii: vec3;
  weights: vec4;
}

function defaultFamilly(ar: number): BoidFamilly {
  return {
    maxSpeed: 0.3,
    size: [BOID_WIDTH, BOID_WIDTH * ar],
    color: BOID_COLOR,
    radii: [8, 2, 4],
    weights: [0.01, 1.0, 0.1, 1.0]
  };
}

export function parseFamilly(params: Partial<BoidsParameters>, ar: number): BoidFamilly {
  const f = defaultFamilly(ar);
  if (params.maxspeed) f.maxSpeed = params.maxspeed;
  return f;
}

export function randomizedBoids(count: number, familly = 0, maxSpeed: number): Boid[] {
  const boids: Boid[] = [];
  for (let index = 0; index < count; index++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * maxSpeed;
    const velocity: vec2 = [Math.cos(angle), Math.sin(angle)];
    vec2.scale(velocity, velocity, speed);
    boids.push({
      pos: randomPoint([0, 0]),
      velocity: velocity,
      familly: familly
    });
  }
  return boids;
}

function randomPoint(out: vec2): vec2 {
  return vec2.set(out, Math.random() * 1.9 - 0.95, Math.random() * 1.9 - 0.95);
}
