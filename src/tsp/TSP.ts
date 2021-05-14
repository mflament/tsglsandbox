import { VertexArray } from '../gl/drawable/VertextArray';
import { Bindable, Deletable } from '../gl/utils/GLUtils';
import { AbstractGLSandbox } from '../gl/sandbox/AbstractGLSandbox';
import { SandboxContainer, SandboxFactory } from '../gl/sandbox/GLSandbox';
import { Program } from '../gl/shader/Program';

import { PoissonDiscSampler, randomRange } from '../utils/PoissonDiscSampler';
import { BufferAttribute, VertexBuffer } from '../gl/buffers/VertexBuffer';

// x,y / r,g,b
const CITY_FLOATS = 5;

const CITY_RADIUS = 0.015;

interface TSPParameters {
  cities: number;
}

class TSPUniforms {
  cityRadius: WebGLUniformLocation | null = null;
  viewMatrix: WebGLUniformLocation | null = null;
}

class TSP extends AbstractGLSandbox<TSPParameters> {
  static async create(container: SandboxContainer, name: string): Promise<TSP> {
    const program = await container.programLoader.load({
      path: 'tsp/tsp-render.glsl',
      uniformLocations: new TSPUniforms()
    });
    const parameters = { cities: 10 };
    window.hashlocation.parseParams(parameters);
    return new TSP(container, name, parameters, program);
  }

  readonly citiesBuffer: CitiesBuffer;

  constructor(
    container: SandboxContainer,
    name: string,
    readonly parameters: TSPParameters,
    readonly renderProgram: Program<any, TSPUniforms>
  ) {
    super(container, name, parameters);
    renderProgram.use();
    this.onresize();
    this.citiesBuffer = new CitiesBuffer(container.gl);
    this.citiesBuffer.cities = randomCities(parameters.cities);
  }

  render(): void {
    super.clear();
    this.citiesBuffer.draw();
  }

  onParametersChanged(): void {
    this.citiesBuffer.cities = randomCities(this.parameters.cities);
  }

  onresize(): void {
    const dim = this.container.dimension;
    const ar = dim[0] / dim[1];
    const sx = Math.min(1, 1 / ar) * 2;
    const sy = Math.min(1, 1 * ar) * 2;
    /* prettier-ignore */
    const viewMatrix = new Float32Array([
      sx, 0, 0, -0.5 * sx,
      0, sy, 0, -0.5 * sy,
      0,  0, 1, 0,
      0,  0, 0, 1,
    ]);
    this.container.gl.uniformMatrix4fv(this.renderProgram.uniformLocations.viewMatrix, false, viewMatrix);
    this.container.gl.uniform1f(this.renderProgram.uniformLocations.cityRadius, (CITY_RADIUS * dim[0]) / 2);
  }
}

export function tsp(): SandboxFactory<TSPParameters> {
  return TSP.create;
}

interface City {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

function randomCities(count: number): City[] {
  const radius = CITY_RADIUS; // Math.max(CITY_RADIUS, 1 / Math.sqrt(count));
  const positions = PoissonDiscSampler.samples(count, radius);
  return positions.map(randomCity);
}

function randomCity(pos: { x: number; y: number }): City {
  return {
    ...pos,
    r: randomRange(0.2, 1),
    g: randomRange(0.2, 1),
    b: randomRange(0.2, 1)
  };
}

interface CitiesAttributes {
  a_cityPosition: BufferAttribute;
  a_cityColor: BufferAttribute;
}

/**
 * TODO : draw instances of quad buffer scaled, offseted, colored using an uniform buffer
 */
class CitiesBuffer implements Bindable, Deletable {
  readonly vao: VertexArray;
  readonly citiesBuffer: VertexBuffer<CitiesAttributes>;
  private _cities: City[] = [];

  constructor(readonly gl: WebGL2RenderingContext) {
    this.citiesBuffer = new VertexBuffer<CitiesAttributes>(gl, {
      a_cityPosition: { size: 2 },
      a_cityColor: { size: 3 }
    }).bind();

    this.vao = new VertexArray(gl).bind().mapAttributes(this.citiesBuffer, {
      a_cityPosition: 0,
      a_cityColor: 1
    });
  }

  get cities(): City[] {
    return this._cities;
  }

  set cities(cities: City[]) {
    this._cities = cities;
    const citiesBuffer = new Float32Array(cities.length * CITY_FLOATS);
    for (let cityIndex = 0; cityIndex < cities.length; cityIndex++) {
      const city = cities[cityIndex];
      let floatIndex = cityIndex * CITY_FLOATS;
      citiesBuffer[floatIndex++] = city.x;
      citiesBuffer[floatIndex++] = city.y;

      citiesBuffer[floatIndex++] = city.r;
      citiesBuffer[floatIndex++] = city.g;
      citiesBuffer[floatIndex++] = city.b;
    }
    this._cities = cities;
    this.citiesBuffer.setdata(citiesBuffer);
  }

  bind(): CitiesBuffer {
    this.citiesBuffer.bind();
    this.vao.bind();
    return this;
  }

  unbind(): CitiesBuffer {
    this.citiesBuffer.unbind();
    this.vao.unbind();
    return this;
  }

  delete(): void {
    this.citiesBuffer.delete();
    this.vao.delete();
  }

  draw(): void {
    this.gl.drawArrays(WebGL2RenderingContext.POINTS, 0, this.cities.length);
  }
}
