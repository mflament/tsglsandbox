import {vec2} from 'gl-matrix';

export interface Boid {
  pos: vec2;
  velocity: vec2;
  familly: number;
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
