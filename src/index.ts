import { DefaultSandboxContainer } from './gl/sandbox/DefaultSanboxContainer';
import { testSandbox } from './test/TestSandbox';
import { gameofLife } from './gol/GameOfLife';
import { setupHashLocation } from './utils/HashUtils';
import { glparticles } from './particles/GLParticles';
import { tsp } from './tsp/TSP';
import { boids } from './boids/Boids';
import { noise } from './test/NoiseSandbox';
import { quadTreeTest } from './test/QuadTreeTest';
import { ants } from './ants/Ants';

setupHashLocation();

new DefaultSandboxContainer({
  gol: gameofLife(),
  particles: glparticles(),
  tsp: tsp(),
  boids: boids(),
  ants: ants(),
  test: testSandbox(),
  qt: quadTreeTest(),
  noise: noise()
}).start();
