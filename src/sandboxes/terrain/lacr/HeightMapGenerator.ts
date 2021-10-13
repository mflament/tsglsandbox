import { createVec2, isFractalNoiseParameters, NoiseParameters, ShaderType } from 'gl';
import {
  BufferGeometry,
  Camera,
  ClampToEdgeWrapping,
  FloatType,
  IUniform,
  Mesh,
  NearestFilter,
  PixelFormat,
  PlaneGeometry,
  RedFormat,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three';
import { vec2 } from 'gl-matrix';
import { ShaderParser } from '../../../gl/shader/parser/ShaderParser';

type NoiseUniforms = {
  size: IUniform<vec2>;
  offset: IUniform<vec2>;
  scale: IUniform<vec2>;
  range: IUniform<vec2>;
  octaves: IUniform<number>;
  persistence: IUniform<number>;
};

type NormalsUniforms = {
  size: IUniform<vec2>;
  uTerrain: IUniform<Texture | null>;
};

type RenderMaterial<U extends { [uniform: string]: IUniform }> = ShaderMaterial & { uniforms: U };

export class HeightMapGenerator {
  static async load(renderer: WebGLRenderer, shaderParser: ShaderParser): Promise<HeightMapGenerator> {
    const gh = await shaderParser.parse('sandboxes/terrain/lacr/generate-height.glsl');
    const gn = await shaderParser.parse('sandboxes/terrain/lacr/generate-normals.glsl');
    return new HeightMapGenerator(renderer, {
      generateHeight: gh.printShader(ShaderType.FRAGMENT_SHADER, false),
      generateNormals: gn.printShader(ShaderType.FRAGMENT_SHADER, false)
    });
  }

  private readonly noiseMaterial: RenderMaterial<NoiseUniforms>;
  private readonly normalsMaterial: RenderMaterial<NormalsUniforms>;

  private heightRenderTarget?: WebGLRenderTarget;
  private normalsRenderTarget?: WebGLRenderTarget;

  private readonly scene: Scene;
  private readonly camera: Camera;
  private readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;

  private constructor(
    readonly renderer: WebGLRenderer,
    readonly shaders: { generateHeight: string; generateNormals: string }
  ) {
    this.noiseMaterial = createRenderMaterial(shaders.generateHeight, {
      size: { value: vec2.create() },
      offset: { value: vec2.create() },
      scale: { value: vec2.create() },
      range: { value: vec2.create() },
      octaves: { value: 0 },
      persistence: { value: 0 }
    });

    this.normalsMaterial = createRenderMaterial(shaders.generateNormals, {
      size: { value: vec2.create() },
      uTerrain: { value: null }
    });

    this.scene = new Scene();
    this.camera = new Camera();
    this.camera.position.z = 1;
    this.mesh = new Mesh(new PlaneGeometry(2, 2));
    this.scene.add(this.mesh);
  }

  generate(params: NoiseParameters): Texture {
    const size = createVec2(params.size);
    this.heightRenderTarget = createRenderTarget(this.heightRenderTarget, size, RedFormat);
    this.normalsRenderTarget = createRenderTarget(this.normalsRenderTarget, size, RGBAFormat);
    this.updateNoiseUniforms(size, params);
    this.updateNormalUniforms(size, this.heightRenderTarget);

    const crt = this.renderer.getRenderTarget();
    this.renderMaterial(this.heightRenderTarget, this.noiseMaterial);
    this.renderMaterial(this.normalsRenderTarget, this.normalsMaterial);
    this.renderer.setRenderTarget(crt);
    //return this.heightRenderTarget.texture;
    return this.normalsRenderTarget.texture;
  }

  private renderMaterial(renderTarget: WebGLRenderTarget, material: ShaderMaterial): void {
    this.renderer.setRenderTarget(renderTarget);
    this.mesh.material = material;
    this.renderer.render(this.scene, this.camera);
  }

  private updateNoiseUniforms(size: vec2, params: NoiseParameters): void {
    const uniforms = this.noiseMaterial.uniforms as NoiseUniforms;
    uniforms.size.value = size;
    uniforms.offset.value = createVec2(params.offset);
    uniforms.scale.value = createVec2(params.scale);
    uniforms.range.value = createVec2(params.range);
    uniforms.octaves.value = 1;
    uniforms.persistence.value = 0;
    if (isFractalNoiseParameters(params)) {
      uniforms.octaves.value = params.octaves;
      uniforms.persistence.value = params.persistence;
    }
    this.noiseMaterial.uniformsNeedUpdate = true;
  }

  private updateNormalUniforms(size: vec2, noiseTarget: WebGLRenderTarget): void {
    const uniforms = this.normalsMaterial.uniforms as NormalsUniforms;
    uniforms.size.value = size;
    uniforms.uTerrain.value = noiseTarget.texture;
    this.normalsMaterial.uniformsNeedUpdate = true;
  }
}

function createRenderTarget(
  current: WebGLRenderTarget | undefined,
  size: vec2,
  format: PixelFormat
): WebGLRenderTarget {
  if (!current || !vec2.equals([current.width, current.height], size)) {
    return new WebGLRenderTarget(size[0], size[1], {
      format: format,
      type: FloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping
    });
  }
  return current;
}

function createRenderMaterial<U extends { [uniform: string]: IUniform }>(fs: string, uniforms: U): RenderMaterial<U> {
  return new ShaderMaterial({
    vertexShader: PASS_THROUGH_SHADER,
    fragmentShader: fs,
    uniforms: uniforms
  }) as RenderMaterial<U>;
}

const PASS_THROUGH_SHADER = `void main() { 
  gl_Position = vec4( position, 1.0 ); 
}`;
