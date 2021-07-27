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
import ReactDOM from 'react-dom';
import React from 'react';
import {SandboxController} from 'gl';

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
  noise: noise(),
  pg: planetGeneratorSandbox()
};

ReactDOM.render(<SandboxController sandboxes={factories}/>, document.body);
