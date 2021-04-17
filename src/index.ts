import { SandboxRunner } from './gl/sandbox/SandboxRunner';
import { test } from './test/TestSandbox';
import { gameofLife } from './gol/GameOfLife';
import { setupHashLocation } from './utils/HashUtils';
import { glparticles } from './particles/GLParticles';
import { tsp } from './tsp/TSP';

setupHashLocation();

new SandboxRunner({ gol: gameofLife(), particles: glparticles(), tsp: tsp(), test: test() }).start();
