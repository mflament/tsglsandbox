import {
  ants,
  boids,
  flowers,
  gameofLife,
  glparticles,
  noise,
  planetGeneratorSandbox,
  quadTreeTest,
  testSandbox,
  testThree,
  tsp
} from './sandboxes';

import React from 'react';
import ReactDOM from 'react-dom';
import {SandboxController} from "gl";

const factories = {
  flowers: flowers(),
  gol: gameofLife(),
  particles: glparticles(),
  tsp: tsp(),
  boids: boids(),
  ants: ants(),
  test: testSandbox(),
  tt: testThree(),
  qt: quadTreeTest(),
  noise: noise(),
  pg: planetGeneratorSandbox()
};

ReactDOM.render(<SandboxController sandboxes={factories}/>, document.body);
