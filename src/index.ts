import { DefaultSandboxContainer } from './gl/sandbox/DefaultSanboxContainer';
import { test } from './test/TestSandbox';
import { gameofLife } from './gol/GameOfLife';
import { setupHashLocation } from './utils/HashUtils';
import { glparticles } from './particles/GLParticles';
import { tsp } from './tsp/TSP';
import { boids } from './boids/Boids';

setupHashLocation();

new DefaultSandboxContainer({
  gol: gameofLife(),
  particles: glparticles(),
  tsp: tsp(),
  boids: boids(),
  test: test()
}).start();
