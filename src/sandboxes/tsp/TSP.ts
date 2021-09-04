import {
  AbstractGLSandbox,
  Bindable,
  BufferAttribute,
  Deletable,
  Program,
  SandboxContainer,
  SandboxFactory,
  VertexArray,
  VertexBuffer,
  control
} from 'gl';
import {PoissonDiscSampler, randomRange} from 'random';

// x,y / r,g,b
const CITY_FLOATS = 5;

const CITY_RADIUS = 0.015;

class TSPParameters {
  @control({min: 1, max: 5000, step: 1})
  cities = 100;
  @control({min: 0.01, max: 0.2, step: 0.01})
  distance = 0.1;
}

class TSPUniforms {
  cityRadius: WebGLUniformLocation | null = null;
  viewMatrix: WebGLUniformLocation | null = null;
}

class TSP extends AbstractGLSandbox<TSPParameters> {
  static async create(container: SandboxContainer, name: string, parameters?: TSPParameters): Promise<TSP> {
    const program = await container.programLoader.load({
      path: 'tsp/tsp-render.glsl',
      uniformLocations: new TSPUniforms()
    });
    return new TSP(container, name, program, parameters);
  }

  readonly citiesBuffer: CitiesBuffer;

  constructor(container: SandboxContainer, name: string, readonly renderProgram: Program<any, TSPUniforms>, parameters?: TSPParameters) {
    super(container, name, parameters);
    renderProgram.use();
    this.onresize();
    this.citiesBuffer = new CitiesBuffer(this.gl);
    this.citiesBuffer.cities = randomCities(this.parameters.cities, this.parameters.distance);
  }

  createDefaultParameters(): TSPParameters {
    return new TSPParameters();
  }

  render(): void {
    super.clear();
    this.citiesBuffer.draw();
  }

  onparameterchange(): void {
    this.citiesBuffer.cities = randomCities(this.parameters.cities, this.parameters.distance);
  }

  onresize(): void {
    const canvas = this.canvas;
    const ar = canvas.aspectRatio;
    const sx = Math.min(1, 1 / ar) * 2;
    const sy = Math.min(1, 1 * ar) * 2;
    /* prettier-ignore */
    const viewMatrix = new Float32Array([
      sx, 0, 0, -0.5 * sx,
      0, sy, 0, -0.5 * sy,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
    this.gl.uniformMatrix4fv(this.renderProgram.uniformLocations.viewMatrix, false, viewMatrix);
    this.gl.uniform1f(this.renderProgram.uniformLocations.cityRadius, (CITY_RADIUS * canvas.width) / 2);
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

function randomCities(count: number, distance: number): City[] {
  const positions = PoissonDiscSampler.samples(count, distance);
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
      a_cityPosition: {size: 2},
      a_cityColor: {size: 3}
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
