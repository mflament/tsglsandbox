import { SandboxRunner } from './gl/sandbox/SandboxRunner';
import { GameOfLife } from './gol/GameOfLife';
import { GLParticles } from './particles/GLParticles';
import { TestSandbox } from './test/TestSandbox';

new SandboxRunner([new TestSandbox(), new GameOfLife(), new GLParticles()]).start();
