import { SandboxRunner } from './gl/sandbox/SandboxRunner';
import { GameOfLife } from './gol/GameOfLife';
import { GLParticles } from './particles/GLParticles';

new SandboxRunner([new GLParticles(), new GameOfLife()]).start();
