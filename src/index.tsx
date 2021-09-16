import {
  ants,
  boids,
  flowers,
  gameOfLife,
  glParticles,
  lacrSandbox,
  noise,
  quadTreeTest,
  testSandbox,
  testThree,
  tsp
} from './sandboxes';
import { planetGeneratorSandbox } from './sandboxes/terrain/planet/PlanetGeneratorSandbox';

import React from 'react';
import ReactDOM from 'react-dom';
import { SandboxController } from 'gl';

const factories = {
  flowers: flowers(),
  gol: gameOfLife(),
  particles: glParticles(),
  tsp: tsp(),
  boids: boids(),
  ants: ants(),
  test: testSandbox(),
  tt: testThree(),
  qt: quadTreeTest(),
  noise: noise(),
  pg: planetGeneratorSandbox(),
  lacr: lacrSandbox()
};

ReactDOM.render(<SandboxController sandboxes={factories} />, document.body);
