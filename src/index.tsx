import {
  testSandbox,
  gameofLife,
  glparticles,
  tsp,
  boids,
  noise,
  quadTreeTest,
  ants,
  flowers,
  testThree
} from './sandboxes';
import ReactDOM from 'react-dom';
import React from 'react';
import { SandboxController } from './gl';

const factories = {
  tt: testThree(),
  flowers: flowers(),
  gol: gameofLife(),
  particles: glparticles(),
  tsp: tsp(),
  boids: boids(),
  ants: ants(),
  test: testSandbox(),
  qt: quadTreeTest(),
  noise: noise()
};

ReactDOM.render(<SandboxController sandboxes={factories} />, document.body);
