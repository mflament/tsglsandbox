export interface Bindable {
  bind(): any;
  unbind(): any;
}

export interface Deletable {
  delete(): void;
}

export function checkNull<T>(creator: () => T | null): T {
  const res = creator();
  if (res == null) throw Error('Error creating object');
  return res;
}

export type ArrayBuffer =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array;

export function isArrayBuffer(obj: unknown): obj is ArrayBuffer {
  return (
    obj instanceof Int8Array ||
    obj instanceof Uint8Array ||
    obj instanceof Uint8ClampedArray ||
    obj instanceof Int16Array ||
    obj instanceof Uint16Array ||
    obj instanceof Int32Array ||
    obj instanceof Uint32Array ||
    obj instanceof Float32Array
  );
}

/**
 * @param s color formated as #rrggbbaa
 */
export function parseColor(s: string, normalize = true): { r: number; g: number; b: number; a: number } {
  let r = parseInt(s.substring(1, 3), 16);
  let g = parseInt(s.substring(3, 5), 16);
  let b = parseInt(s.substring(5, 7), 16);
  let a = 255;
  if (s.length > 7) a = parseInt(s.substring(7, 9), 16);
  if (normalize) {
    r /= 255;
    g /= 255;
    b /= 255;
    a /= 255;
  }
  return { r: r, g: g, b: b, a: a };
}

export function safeDelete(deletable?: Deletable | null): void {
  if (deletable) deletable.delete;
}

export function nextPowerOfTwo(n: number): number {
  if (n === 0) return 1;
  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  return n + 1;
}
