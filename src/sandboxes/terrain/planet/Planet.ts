import { Mesh } from 'three';
import { PlanetMaterial } from './PlanetMaterial';
import { PlanetBufferGeometry } from './PlanetBufferGeometry';
import { Deletable } from 'gl';

export const NORMAL_OFFSET = 3;
export const UV_OFFSET = 6;
export const COLOR_OFFSET = 8;

export class Planet implements Deletable {
  readonly mesh: Mesh<PlanetBufferGeometry, PlanetMaterial>;
  private _triangleStrip = true;

  constructor(readonly material: PlanetMaterial, readonly maxResolution: number, triangleStrip: boolean) {
    this.mesh = new Mesh(new PlanetBufferGeometry(maxResolution, false), material);
    this.triangleStrip = triangleStrip;
  }

  get geometry(): PlanetBufferGeometry {
    return this.mesh.geometry;
  }

  get indexCount(): number {
    return this.geometry.indexCount;
  }

  get vertexCount(): number {
    return this.geometry.vertexCount;
  }

  get triangleStrip(): boolean {
    return this._triangleStrip;
  }

  set triangleStrip(ts: boolean) {
    this.mesh.mode = ts ? WebGL2RenderingContext.TRIANGLE_STRIP : WebGL2RenderingContext.TRIANGLES;
  }

  delete(): void {
    this.mesh.geometry.dispose();
  }
}
