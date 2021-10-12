/**
 * Terrain Geometry : LOD Adapting Concentric Rings
 * @see WebGL.Insights.-.Patrick.Cozzi.pdf @279
 */
import {
  AbstractThreeSandbox,
  checkNull,
  control,
  FractalNoiseParameters,
  OrbitControls,
  SandboxContainer,
  SandboxFactory
} from 'gl';
import {
  BufferGeometry,
  Camera,
  DirectionalLight,
  Float32BufferAttribute,
  IUniform,
  Mesh,
  Object3D,
  PerspectiveCamera,
  ShaderMaterial,
  Texture,
  Uint32BufferAttribute,
  UniformsLib,
  UniformsUtils,
  WebGLRenderer
} from 'three';
import { vec2 } from 'gl-matrix';
import { randomSimplexSeed } from 'random';
import { HeightMapGenerator } from './HeightMapGenerator';

const MAX_GRID_SIZE = 512;
const MAX_INDEX_COUNT = MAX_GRID_SIZE * MAX_GRID_SIZE * 2 * 3;
const MAX_VERTEX_COUNT = (MAX_GRID_SIZE + 1) * (MAX_GRID_SIZE + 1);
const VERTEX_SIZE = 2;

class LACRParameters {
  @control({ min: 2, max: MAX_GRID_SIZE, step: 2 })
  readonly gridSize = 16;
  readonly heightMap = new HeightMapParams();
  readonly wireframe = true;
}

class HeightMapParams implements FractalNoiseParameters {
  @control({ isVisible: false })
  seed = randomSimplexSeed();
  @control({ min: 16, max: 2048, step: 8 })
  size = 512;
  @control({ min: 0, max: 10, step: 0.1 })
  offset: vec2 = [0, 0];
  @control({ min: 1, max: 10, step: 0.1 })
  scale = 1;
  @control({ min: 1, max: 16, step: 1 })
  octaves = 8;
  @control({ min: 0, max: 1, step: 0.01 })
  persistence = 0.2;
  @control({ labels: ['Min', 'Max'], min: -1, max: 1, step: 0.1 })
  range: vec2 = [0, 0.2];
}

type LACRUniforms = {
  gridSize: IUniform<number>;
  gridScale: IUniform<number>;
  textureScale: IUniform<number>;
  uTerrain: IUniform<Texture | null>;
};

export class LACRSandbox extends AbstractThreeSandbox<LACRParameters> {
  static readonly factory = AbstractThreeSandbox.sandboxFactory(LACRSandbox.create);

  private static async create(
    container: SandboxContainer,
    renderer: WebGLRenderer,
    name: string,
    parameters?: LACRParameters
  ): Promise<LACRSandbox> {
    const vs = await container.shaderLoader.load('sandboxes/terrain/lacr/lacr.vs.glsl');
    const fs = await container.shaderLoader.load('sandboxes/terrain/lacr/lacr.fs.glsl');
    const ng = await HeightMapGenerator.load(renderer, container.shaderParser);
    return new LACRSandbox(container, renderer, name, parameters || new LACRParameters(), ng, { vs: vs, fs: fs });
  }

  private readonly orbitControls: OrbitControls;
  private readonly material: ShaderMaterial;
  private readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;

  private gridSize?: number;
  private readonly heighMapSampler: WebGLSampler;

  constructor(
    container: SandboxContainer,
    renderer: WebGLRenderer,
    name: string,
    parameters: LACRParameters,
    private readonly noiseGenerator: HeightMapGenerator,
    private readonly shaders: { vs: string; fs: string }
  ) {
    super(container, renderer, name, parameters);

    this.material = new ShaderMaterial({
      vertexShader: this.shaders.vs,
      fragmentShader: this.shaders.fs,
      wireframe: parameters.wireframe,
      uniforms: UniformsUtils.merge([
        UniformsLib['lights'],
        {
          gridSize: { value: parameters.gridSize },
          gridScale: { value: 1 },
          uTerrain: { value: null },
          textureScale: { value: 1 }
        } as LACRUniforms
      ]),
      precision: 'highp',
      lights: true
    });
    this.heighMapSampler = this.createHeightMapSampler();

    const bufferGeometry = new BufferGeometry();
    bufferGeometry.setIndex(new Uint32BufferAttribute(new Uint32Array(MAX_INDEX_COUNT), 1));
    bufferGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array(MAX_VERTEX_COUNT * VERTEX_SIZE), VERTEX_SIZE)
    );

    this.mesh = new Mesh<BufferGeometry, ShaderMaterial>(bufferGeometry, this.material);
    this.mesh.frustumCulled = false;

    this.scene.add(...this.createLights());
    this.scene.add(this.mesh);

    this.camera.position.y = 0.5;
    this.camera.position.z = 0.5;

    this.orbitControls = new OrbitControls(this.camera, container.canvas.element);
    this.orbitControls.update();

    this.onparameterchange();
  }

  // @ts-ignore
  private createHeightMapSampler() {
    const filter =
      this.gl.getExtension('OES_texture_float_linear') !== null
        ? WebGL2RenderingContext.LINEAR
        : WebGL2RenderingContext.NEAREST;
    const hsm = checkNull(() => this.gl.createSampler());
    this.gl.samplerParameteri(hsm, WebGL2RenderingContext.TEXTURE_MIN_FILTER, filter);
    this.gl.samplerParameteri(hsm, WebGL2RenderingContext.TEXTURE_MAG_FILTER, filter);
    this.gl.samplerParameteri(hsm, WebGL2RenderingContext.TEXTURE_WRAP_S, WebGL2RenderingContext.CLAMP_TO_EDGE);
    this.gl.samplerParameteri(hsm, WebGL2RenderingContext.TEXTURE_WRAP_T, WebGL2RenderingContext.CLAMP_TO_EDGE);
    return hsm;
  }

  delete(): void {
    super.delete();
    this.orbitControls.dispose();
  }

  protected createCamera(): Camera {
    return new PerspectiveCamera(75, this.canvas.aspectRatio, 0.001, 100);
  }

  get uniforms(): LACRUniforms {
    return this.material.uniforms as LACRUniforms;
  }

  createDefaultParameters(): LACRParameters {
    return new LACRParameters();
  }

  onparameterchange(): void {
    const params = this.parameters;
    const hm = this.updateHeightMap(params.heightMap);
    if (!hm) return;

    const gridSize = Math.min(params.gridSize, MAX_GRID_SIZE);
    if (this.gridSize !== gridSize) {
      this.createTerrain(gridSize);
      this.gridSize = gridSize;
    } else {
      this.renderer.attributes.get(this.mesh.geometry.getAttribute('position'));
    }

    this.gl.bindSampler(0, this.heighMapSampler);
    this.uniforms.gridSize.value = params.gridSize;
    this.uniforms.uTerrain.value = hm;
    this.material.wireframe = params.wireframe;
    this.material.uniformsNeedUpdate = true;
  }

  private updateHeightMap(params: HeightMapParams): Texture | undefined {
    if (this.noiseGenerator) return this.noiseGenerator.generate(params);
    return undefined;
  }

  private createTerrain(gridSize: number): void {
    const halfGridSize = gridSize / 2;
    const vertexCount = (gridSize + 1) * (gridSize + 1);
    const geometry = this.mesh.geometry;
    const positions = geometry.getAttribute('position');
    let vertexIndex = 0;
    for (let y = -halfGridSize; y <= halfGridSize; y++) {
      for (let x = -halfGridSize; x <= halfGridSize; x++) {
        positions.setXY(vertexIndex, x, y);
        vertexIndex++;
      }
    }
    if (vertexIndex !== vertexCount) throw new Error('Missing some vertex');
    positions.needsUpdate = true;

    const indexAttribute = geometry.index;
    if (!indexAttribute) throw new Error('No index');
    const triangles = gridSize * gridSize * 2;
    const indexCount = triangles * 3;
    let index = 0;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const v1 = row * (gridSize + 1) + col;
        const v2 = v1 + 1;
        const v3 = v1 + gridSize + 1;
        const v4 = v3 + 1;

        indexAttribute.setXYZ(index, v1, v3, v2);
        index += 3;

        indexAttribute.setXYZ(index, v3, v4, v2);
        index += 3;
      }
    }
    if (index !== indexCount) throw new Error('Missing some index');
    indexAttribute.needsUpdate = true;

    geometry.setDrawRange(0, indexCount);
  }

  private createLights(): Object3D[] {
    return [new DirectionalLight(0xffffff, 0.5)];
  }
}

export function lacrSandbox(): SandboxFactory {
  return LACRSandbox.factory;
}
