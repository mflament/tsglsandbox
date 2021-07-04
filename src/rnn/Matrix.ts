export type MatrixArray = Float32Array | Float64Array;
type MutableArrayLike<T> = {
  readonly length: number;
  [n: number]: T;
};

interface MatrixDimension {
  rows: number;
  columns: number;
}

function isMatrixDimension(o: any): o is MatrixDimension {
  return (
    typeof o === 'object' &&
    typeof (o as MatrixDimension).rows === 'number' &&
    typeof (o as MatrixDimension).columns === 'number'
  );
}

export interface MatrixFactory<T extends MatrixArray = MatrixArray> {
  (rows: number, columns: number): Matrix<T>;
  (dim: MatrixDimension): Matrix<T>;
  (values: number[][]): Matrix<T>;
  (capacity: number): Matrix<T>;
}

export class Matrix<T extends MatrixArray = MatrixArray> {
  static float32Factory = Matrix.newMatrixFactory(s => new Float32Array(s));
  static float64Factory = Matrix.newMatrixFactory(s => new Float64Array(s));

  static float32(rows: number, columns = rows): Matrix<Float32Array> {
    return this.float32Factory(rows, columns);
  }

  static float64(rows: number, columns = rows): Matrix<Float64Array> {
    return new Matrix(rows, columns, s => new Float64Array(s));
  }

  private _array: T;

  private constructor(private _rows: number, private _columns: number, private readonly newArray: (size: number) => T) {
    this._array = newArray(this.rows * this.columns);
  }

  get rows(): number {
    return this._rows;
  }

  get columns(): number {
    return this._columns;
  }

  get array(): T {
    return this._array;
  }

  get(row: number, col: number): number {
    return this._array[this.offset(row, col)];
  }

  set(row: number, col: number, value: number): void {
    this._array[this.offset(row, col)] = value;
  }

  private offset(row: number, col: number): number {
    if (row >= this._rows) throw new Error(`Row ${row} is out of bound [0,${this._rows})`);
    if (col >= this._columns) throw new Error(`Column ${col} is out of bound [0,${this._columns})`);
    return row * this._columns + col;
  }

  getRow(row: number, target?: MutableArrayLike<number>): ArrayLike<number> {
    if (!target) target = new Array(this.columns);
    for (let col = 0; col < this._columns; col++) {
      target[col] = this._array[this.offset(row, col)];
    }
    return target;
  }

  setRow(row: number, values: ArrayLike<number>): Matrix<T> {
    if (values.length != this._columns) throw new Error(`Invalid values ${row} is out of bound [0,${this._rows})`);
    this._array.set(values, this.offset(row, 0));
    return this;
  }

  transpose(out?: Matrix<T>): Matrix<T> {
    out = this.prep(out, this._columns, this._rows);
    for (let row = 0; row < this._rows; row++) {
      for (let col = 0; col < this._columns; col++) {
        out.set(col, row, this.get(row, col));
      }
    }
    return out;
  }

  dot(m: Matrix, out?: Matrix<T>): Matrix<T> {
    if (this._columns !== m._rows) throw new Error(`rows/columns mismatch ${m._rows} , ${this._columns}`);
    out = this.prep(out, this._rows, m._columns);
    m = this.snapshot(m, out);

    for (let row = 0; row < this._rows; row++) {
      for (let col = 0; col < m._columns; col++) {
        let sum = 0;
        for (let i = 0; i < this._columns; i++) {
          sum += this.get(row, i) * m.get(i, col);
        }
        out.set(row, col, sum);
      }
    }
    return out;
  }

  sumRows(out?: Matrix<T>): Matrix<T> {
    out = this.prep(out, 1, this._columns);
    for (let row = 0; row < this._rows; row++) {
      for (let col = 0; col < this._columns; col++) {
        out._array[col] += this.get(row, col);
      }
    }
    return out;
  }

  maxIndices(out?: Matrix<T>): Matrix<T> {
    out = this.prep(out, this._rows, 1);
    if (this._columns === 0) return out;
    for (let row = 0; row < this._rows; row++) {
      out.set(row, 0, this.maxIndex(row));
    }
    return out;
  }

  maxIndex(row: number): number {
    const rowOffset = this.offset(row, 0);
    let maxIndex = 0;
    let max = this.array[rowOffset];
    for (let col = 1; col < this._columns; col++) {
      const current = this.array[rowOffset + col];
      if (current > max) {
        max = current;
        maxIndex = col;
      }
    }
    return maxIndex;
  }

  forEach(f: (row: number, col: number, v: number) => void): void {
    for (let row = 0; row < this._rows; row++) {
      const rowOffset = this.offset(row, 0);
      for (let col = 0; col < this._columns; col++) {
        f(row, col, this.array[rowOffset + col]);
      }
    }
  }

  fill(f: ((row: number, col: number) => number) | number): void {
    if (typeof f === 'number') {
      this._array.fill(f, 0, this._rows * this._columns);
    } else {
      for (let row = 0; row < this._rows; row++) {
        const rowOffset = this.offset(row, 0);
        for (let col = 0; col < this._columns; col++) {
          this.array[rowOffset + col] = f(row, col);
        }
      }
    }
  }

  update(f: (row: number, col: number, current: number) => number): void {
    this.fill((r, c) => f(r, c, this.get(r, c)));
  }

  reshape(rows: number, columns: number): Matrix<T> {
    const cap = rows * columns;
    if (this._array.length < cap) this._array = this.newArray(cap);
    this._rows = rows;
    this._columns = columns;
    return this;
  }

  toString(): string {
    let s = '';
    for (let row = 0; row < this.rows; row++) {
      if (row === 0) s += '[';
      else s += ' ';
      for (let col = 0; col < this.columns; col++) {
        s += this.get(row, col).toFixed(3);
        if (col < this.columns - 1) s += ', ';
      }
      s += '\n';
    }
    s += ']';
    return s;
  }

  copy(out?: Matrix<T>): Matrix<T> {
    out = this.prep(out);
    out._array.set(this._array);
    return out;
  }

  private newMatrix(row: number, col: number): Matrix<T> {
    return new Matrix(row, col, this.newArray);
  }

  private prep(out?: Matrix<T>, rows = this._rows, columns = this._columns): Matrix<T> {
    if (!out) out = this.newMatrix(rows, columns);
    else out.reshape(rows, columns).fill(0);
    return out;
  }

  private snapshot(m: Matrix, out: Matrix): Matrix {
    if (m === out) return m.copy();
    return m;
  }

  private static newMatrixFactory<T extends MatrixArray>(arrayFactory: (p: number) => T): MatrixFactory<T> {
    return (param: any, columns?: any): Matrix<T> => {
      if (isMatrixDimension(param)) return new Matrix(param.rows, param.columns, arrayFactory);
      else if (typeof param === 'number') {
        if (typeof columns === 'number') return new Matrix(param, columns, arrayFactory);
        return new Matrix(param, 1, arrayFactory).reshape(0, 0);
      } else if (Array.isArray(param) && Array.isArray(param[0])) {
        columns = param[0].length;
        const m = new Matrix(param.length, columns, arrayFactory);
        for (let row = 0; row < param.length; row++) {
          const rowCols = param[row].length;
          if (rowCols !== columns)
            throw new Error(`Mismatched columns count at row ${row} : actual ${rowCols} exected ${columns}`);
          m.setRow(row, param[row]);
        }
        return m;
      }
      throw new Error('Invalid arguments ' + [param, columns]);
    };
  }
}
