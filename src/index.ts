import { SandboxRunner } from './gl/sandbox/SandboxRunner';
import { GameOfLife } from './gol/GameOfLife';
import { TestSandbox } from './test/TestSandbox';

new SandboxRunner([new TestSandbox(), new GameOfLife()]).start();
