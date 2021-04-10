import { glCreate } from './gl-utils';
import { GLSandbox } from './gl-sandbox';
import { TestSandbox } from './test-sandbox';

async function startSandbox(sandbox: GLSandbox): Promise<void> {
  const container = glCreate(() => document.getElementById('application'));
  const canvas = document.createElement('canvas');
  container.append(canvas);
  const gl = glCreate(() => canvas.getContext('webgl2'));

  const resize = () => {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (sandbox.resize) sandbox.resize(canvas);
  };
  window.addEventListener('resize', resize);

  if (sandbox.setup) await sandbox.setup(gl, canvas);
  addListener(canvas, sandbox, 'onmousedown');
  addListener(canvas, sandbox, 'onmouseup');
  addListener(canvas, sandbox, 'onmousemove');
  addListener(canvas, sandbox, 'onwheel');
  addListener(canvas, sandbox, 'onkeydown');
  addListener(canvas, sandbox, 'onkeyup');

  const render = () => {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    sandbox.render();
    requestAnimationFrame(render);
  };

  resize();
  requestAnimationFrame(render);
}

function addListener<K extends keyof GLSandbox & keyof HTMLCanvasElement>(
  canvas: HTMLCanvasElement,
  sandbox: GLSandbox,
  method: K
) {
  const listener = sandbox[method] as (e: Event) => void;
  if (listener) canvas[method] = (e: Event) => listener(e);
}

startSandbox(new TestSandbox());
