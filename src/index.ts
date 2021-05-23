import { setupHashLocation } from 'utils';
import { DefaultSandboxContainer } from 'gl';
import {
  testSandbox,
  gameofLife,
  glparticles,
  tsp,
  boids,
  noise,
  quadTreeTest,
  ants,
  flowers
} from './sandboxes/sandboxes';

setupHashLocation();

new DefaultSandboxContainer({
  gol: gameofLife(),
  particles: glparticles(),
  tsp: tsp(),
  boids: boids(),
  ants: ants(),
  test: testSandbox(),
  qt: quadTreeTest(),
  noise: noise(),
  flowers: flowers()
}).start();
