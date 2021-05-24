import { vec2, vec4 } from 'gl-matrix';
import {
  VertexBuffer,
  DrawMode,
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  IndexedDrawable,
  InstancedDrawable,
  FrameBuffer,
  newQuadDrawable
} from 'gl';

import { BoidsParameters } from './BoidsParameters';
import { Boid, randomizedBoids } from './Boid';
import { BoidFamilly, BoidFamillyBuffer } from './BoidFamilly';
import { BoidPrograms } from './BoidPrograms';
import { BoidsDataTextures } from './BoidTextures';

export function boids(): SandboxFactory<BoidsParameters> {
  return GLBoids.create;
}

const MAX_BOIDS = 1024;

const TEST_BOIDS: Boid[] | undefined = undefined;
// const TEST_BOIDS: Boid[] = [
//   { pos: [0.0, 0.05], velocity: [0.0, 1.0], familly: 0 },
//   { pos: [0.0, -0.05], velocity: [0.0, -1.0], familly: 0 }
// ];

class GLBoids extends AbstractGLSandbox<BoidsParameters> {
  static async create(container: SandboxContainer, name: string): Promise<GLBoids> {
    const parameters: BoidsParameters = {
      count: 20,
      acceleration: 0.2,
      maxSpeed: 0.4,
      turnSpeed: 180,
      fov: 110
    };
    window.hashLocation.parseParams(parameters);
    return new GLBoids(container, name, parameters, await BoidPrograms.create(container.programLoader));
  }

  private readonly frameBuffer: FrameBuffer;
  private readonly renderDrawable: InstancedDrawable;
  private readonly quadDrawable: IndexedDrawable;

  private readonly families: BoidFamilly[];
  private readonly famillyBuffers: BoidFamillyBuffer[];
  private readonly boids: BoidsDataTextures[]; // [famillyIndex] : familly's  boids

  constructor(container: SandboxContainer, name: string, parameters: BoidsParameters, readonly programs: BoidPrograms) {
    super(container, name, parameters);

    this.families = [this.defaultFamilly()];
    this.famillyBuffers = [new BoidFamillyBuffer(this.gl)];
    this.boids = [new BoidsDataTextures(this.gl, MAX_BOIDS)];

    this.renderDrawable = this.createRenderDrawable();
    this.quadDrawable = newQuadDrawable(this.gl);
    this.frameBuffer = new FrameBuffer(this.gl);

    programs.setupUniforms();

    if (TEST_BOIDS) {
      parameters.count = TEST_BOIDS.length;
      this.boids[0].pushBoids(TEST_BOIDS);
    }

    this.onParametersChanged();

    this.programs.renderBoids.use();
    this.renderDrawable.bind();
  }

  render(): void {
    this.clear([0, 0, 0, 1], WebGL2RenderingContext.COLOR_BUFFER_BIT);
    for (let i = 0; i < this.famillyBuffers.length; i++) {
      const boids = this.boids[i];
      boids.bind();
      const familly = this.famillyBuffers[i];
      familly.bind();
      this.renderDrawable.draw(boids.boidsCount);
    }
  }

  update(time: number, dt: number): void {
    this.programs.updateBoids.use();
    for (let i = 0; i < this.families.length; i++) {
      const boids = this.boids[i];
      boids.bind();

      const famillyBuffer = this.famillyBuffers[i];
      famillyBuffer.bind();

      this.programs.prepareUpdate(boids.boidsCount, time, dt);

      const boidsData = boids.data[1];
      this.frameBuffer.bind().attach(boidsData.data);

      this.gl.viewport(0, 0, boids.boidsCount, 1);
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT);

      this.quadDrawable.bind().draw();
      this.frameBuffer.checkStatus();

      this.frameBuffer.detach();
      this.frameBuffer.unbind();

      this.gl.viewport(0, 0, this.container.dimension[0], this.container.dimension[1]);

      boids.swapBoids();
    }

    this.programs.renderBoids.use();
    this.renderDrawable.bind();
  }

  onkeydown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case 'n':
        this.update(0, 0);
        break;
    }
  }

  onParametersChanged(): void {
    const params = this.parameters;
    params.count = Math.min(MAX_BOIDS, this.parameters.count);
    const familly = this.families[0];
    const boids = this.boids[0];
    if (params.count < boids.boidsCount) boids.removeBoids(boids.boidsCount - params.count);
    else if (params.count > boids.boidsCount) {
      const missing = params.count - boids.boidsCount;
      const newBoids = randomizedBoids(missing, 0, familly.maxSpeed);
      boids.pushBoids(newBoids);
    }
    familly.acceleration = params.acceleration;
    familly.maxSpeed = params.maxSpeed;
    familly.turnSpeed = params.turnSpeed;
    familly.fov = params.fov;
    this.famillyBuffers[0].update(familly);
  }

  onresize(dim: vec2): void {
    const ar = dim[0] / dim[1];
    this.families.forEach((f, index) => {
      f.scale[1] = f.scale[0] * ar;
      this.famillyBuffers[index].update(f);
    });
  }

  delete(): void {
    this.famillyBuffers.forEach(f => f.delete());
    super.delete();
  }

  private createRenderDrawable(): InstancedDrawable {
    const vertices = new VertexBuffer(this.gl, { a_position: { size: 2 } });
    vertices.bind().setdata(BOIDS_VERTICES);
    return new InstancedDrawable(this.gl, DrawMode.TRIANGLES, {
      buffer: vertices,
      locations: { a_position: 0 }
    });
  }

  private defaultFamilly(width = BOID_WIDTH): BoidFamilly {
    const params = this.parameters;
    return {
      scale: [width, width * this.container.aspectRatio],
      acceleration: params.acceleration,
      maxSpeed: params.maxSpeed,
      turnSpeed: params.turnSpeed,
      fov: params.fov,
      color: BOID_COLOR,
      radii: [8, 3, 5, 0],
      weights: [0.01, 1, 0.1, 0.3]
    };
  }
}

const BOID_WIDTH = 2.0 / 100;
const BOID_COLOR: vec4 = [0, 1, 0, 1];

// prettier-ignore
const BOIDS_VERTICES = [
  -0.25, 0,
  0.5, 0,
  -0.5, 0.5,
  -0.25, 0,
  -0.5, -0.5,
  0.5, 0
];
