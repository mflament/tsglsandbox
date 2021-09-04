import {
  AdditiveBlending,
  Color,
  FrontSide,
  Material,
  MeshStandardMaterial,
  ShaderMaterial,
  Texture
} from "three";
import {HttpShaderLoader} from "gl";

export type PlanetMaterial = Material & {
  wireframe: boolean;
  setColor(v: number): void;
  setTexture(t: Texture | null): void;
}

export class BasicPlanetMaterial extends MeshStandardMaterial implements PlanetMaterial {
  constructor() {
    super({side: FrontSide});
  }

  setColor(v: number): void {
    super.color = new Color(v);
  }

  setTexture(t: Texture | null): void {
    super.map = t;
  }

}

export class ShaderPlanetMaterial extends ShaderMaterial implements PlanetMaterial {
  static async load(): Promise<ShaderPlanetMaterial> {
    const loader = new HttpShaderLoader('shaders/planetgenerator');
    const vs = await loader.load('render-planet.vs.glsl');
    const fs = await loader.load('render-planet.fs.glsl');
    return new ShaderPlanetMaterial(vs, fs);
  }

  color = new Color(0, 0, 255);

  private constructor(vs: string, fs: string) {
    super({
      vertexShader: vs,
      fragmentShader: fs,
      blending: AdditiveBlending,
      uniforms: {
        planetColor: {value: new Color(0, 0, 255)},
        texture: {value: null}
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
