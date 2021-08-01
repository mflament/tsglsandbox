import {mat4, vec3, quat2} from 'gl-matrix';

export class Object3D {
  static readonly DEFAULT_UP = [0, 1, 0];
  name = '';
  parent?: Object3D;
  children: Object3D[] = [];

  private readonly _modelView = mat4.create();

  rotate(axis: vec3, rad: number): void {
    mat4.rotate(this._modelView, this._modelView, rad, axis);
  }

  rotateX(rad: number): void {
    mat4.rotateX(this._modelView, this._modelView, rad);
  }

  rotateY(rad: number): void {
    mat4.rotateY(this._modelView, this._modelView, rad);
  }

  rotateZ(rad: number): void {
    mat4.rotateZ(this._modelView, this._modelView, rad);
  }

  rotate(rad: number): void {
    mat4.rotateZ(this._modelView, this._modelView, rad);
  }

}
