import { AdditiveBlending, Color, FrontSide, Material, MeshStandardMaterial, ShaderMaterial, Texture } from 'three';
import { ShaderLoader, shaderPath } from 'gl';

export type PlanetMaterial = Material & {
  wireframe: boolean;
  setColor(v: number): void;
  setTexture(t: Texture | null): void;
};

export class BasicPlanetMaterial extends MeshStandardMaterial implements PlanetMaterial {
  constructor() {
    super({ side: FrontSide });
  }

  setColor(v: number): void {
    super.color = new Color(v);
  }

  setTexture(t: Texture | null): void {
    super.map = t;
  }
}

export class ShaderPlanetMaterial extends ShaderMaterial implements PlanetMaterial {
  static async load(loader: ShaderLoader): Promise<ShaderPlanetMaterial> {
    const vs = await loader.load(shaderPath('render-planet.vs.glsl', import.meta));
    const fs = await loader.load(shaderPath('render-planet.fs.glsl', import.meta));
    return new ShaderPlanetMaterial(vs, fs);
  }

  color = new Color(0, 0, 255);

  private constructor(vs: string, fs: string) {
    super({
      vertexShader: vs,
      fragmentShader: fs,
      blending: AdditiveBlending,
      uniforms: {
        planetColor: { value: new Color(0, 0, 255) },
        texture: { value: null }
      }
    });
  }

  setColor(v: number): void {
    this.uniforms['planetColor'].value = new Color(v);
    this.uniformsNeedUpdate = true;
  }

  setTexture(t: Texture | null): void {
    this.uniforms['texture'].value = t;
    this.uniformsNeedUpdate = true;
  }
}
