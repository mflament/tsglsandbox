/**
 * Terrain Geometry : LOD Adapting Concentric Rings
 * @see WebGL.Insights.-.Patrick.Cozzi.pdf
 */
import {
  AbstractThreeSandbox,
  control,
  FractalNoiseParameters,
  GLTexture2D,
  InternalFormat,
  NoiseTextureGenerator,
  OrbitControls,
  SandboxContainer,
  SandboxFactory,
  shaderPath,
  TextureMagFilter,
  TextureMinFilter
} from 'gl';
import {
  BufferGeometry,
  Camera,
  Float32BufferAttribute,
  IUniform,
  Mesh,
  PerspectiveCamera,
  ShaderMaterial,
  Uint32BufferAttribute
} from 'three';

const MAX_GRID_SIZE = 512;
const MAX_INDEX_COUNT = MAX_GRID_SIZE * MAX_GRID_SIZE * 2 * 3;
const MAX_VERTEX_COUNT = (MAX_GRID_SIZE + 1) * (MAX_GRID_SIZE + 1);
const VERTEX_SIZE = 3;

const HEIGHT_MAP_PARAMS: FractalNoiseParameters = {
  width: 512,
  height: 512,
  float32: true,
  scale: 5,
  octaves: 8,
  persistence: 0.05,
  normalize: false,
  range: [0, 0.2]
};

class LACRParameters {
  @control({ min: 2, max: MAX_GRID_SIZE, step: 2 })
  readonly gridSize = 16;
}

type LACRUniforms = {
  gridSize: IUniform<number>;
  gridScale: IUniform<number>;
  heightmap: IUniform<number>;
  textureScale: IUniform<number>;
};

export class LACRSandbox extends AbstractThreeSandbox<LACRParameters> {
  static async create(container: SandboxContainer, name: string): Promise<LACRSandbox> {
    const vs = await container.shaderLoader.load(shaderPath('lacr.vs.glsl', import.meta));
    return new LACRSandbox(container, name, new LACRParameters(), vs);
  }

  private readonly orbitControls: OrbitControls;
  private readonly uniforms: LACRUniforms;

  private readonly material: ShaderMaterial;
  private readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;
  private readonly heightMap: GLTexture2D;

  constructor(container: SandboxContainer, name: string, parameters: LACRParameters, readonly vertexShader: string) {
    super(container, name, parameters);

    this.uniforms = {
      gridSize: { value: parameters.gridSize },
      gridScale: { value: 1 },
      heightmap: { value: 0 },
      textureScale: { value: 1 }
    };

    const noiseGenerator = new NoiseTextureGenerator(this.gl);
    this.heightMap = new GLTexture2D(this.gl, InternalFormat.R32F)
      .activate(0)
      .bind()
      .minFilter(TextureMinFilter.LINEAR_MIPMAP_LINEAR)
      .magFilter(TextureMagFilter.LINEAR)
      .freeze(HEIGHT_MAP_PARAMS.width, HEIGHT_MAP_PARAMS.height, 4)
      .generateMimap();
    noiseGenerator.update(HEIGHT_MAP_PARAMS, this.heightMap);

    this.material = new ShaderMaterial({
      vertexShader: vertexShader,
      wireframe: true,
      uniforms: this.uniforms,
      precision: 'highp',
      clipping: false
    });

    const bufferGeometry = new BufferGeometry();
    bufferGeometry.setIndex(new Uint32BufferAttribute(new Uint32Array(MAX_INDEX_COUNT), 1));
    bufferGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array(MAX_VERTEX_COUNT * VERTEX_SIZE), VERTEX_SIZE)
    );
    this.mesh = new Mesh<BufferGeometry, ShaderMaterial>(bufferGeometry, this.material);
    this.mesh.frustumCulled = false;

    this.createTerrain(parameters.gridSize);

    this.scene.add(this.mesh);

    this.camera.position.y = 0.5;
    this.camera.position.z = 0.5;

    this.orbitControls = new OrbitControls(this.camera, container.canvas.element);
    this.orbitControls.update();
  }

  delete(): void {
    super.delete();
    this.orbitControls.dispose();
  }

  protected createCamera(): Camera {
    return new PerspectiveCamera(75, this.canvas.aspectRatio, 0.001, 100);
  }

  createDefaultParameters(): LACRParameters {
    return new LACRParameters();
  }

  onparameterchange(params: LACRParameters): void {
    this.uniforms.gridSize.value = params.gridSize;
    this.material.uniformsNeedUpdate = true;
    this.createTerrain(params.gridSize);
  }

  private createTerrain(gridSize: number): void {
    gridSize = Math.min(gridSize, MAX_GRID_SIZE);
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
        const v4 = v2 + gridSize + 1;

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
}

export function lacrSandbox(): SandboxFactory {
  return LACRSandbox.create;
}
