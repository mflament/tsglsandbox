export class Triangles {
  readonly array: Uint32Array;
  private _count = 0;

  constructor(param: number | Uint32Array) {
    if (typeof param === 'number')
      this.array = new Uint32Array(param * 3);
    else
      this.array = param;
  }

  get capacity(): number {
    return this.array.length;
  }

  get count(): number {
    return this._count;
  }

  push(a: number, b: number, c: number): void {
    const offset = this._count * 3;
    this.array[offset] = a;
    this.array[offset + 1] = b;
    this.array[offset + 2] = c;
    this._count++;
  }

  reset() {
    this._count = 0;
  }

}
