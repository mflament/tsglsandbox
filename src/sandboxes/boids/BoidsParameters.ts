import {control} from 'gl';

export const MAX_BOIDS = 1024;
export class BoidsParameters {
  @control({ min: 1, max: MAX_BOIDS, step: 1 })
  count = 20;
  @control({ min: 0.01, max: 10, step: 0.01 })
  acceleration = 0.2;
  @control({ min: 0.01, max: 10, step: 0.01 })
  maxSpeed = 0.4;
  @control({ min: 1, max: 3600, step: 1 })
  turnSpeed = 180;
  @control({ min: 5, max: 360, step: 1 })
  fov = 110;
}
