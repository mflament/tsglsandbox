import { IndexedBufferDrawable } from './GLDrawable';

/**
 * VAO + VBO + IBO for a simple quad with vec2 position attributes:
 *   P0 (-1,1) ------------- P1(1,1)
 *    |                        |
 *    |                        |
 *    |                        |
 *   P3 (-1,-1) ------------ P2(1,-1)
 *
 * Indexed as 2 triangles : [P3, P1, P0][P3, P2, P1]
 */
const VERTICES = [-1, 1, 1, 1, 1, -1, -1, -1];
const INDICES = [3, 1, 0, 3, 2, 1];

export function newQuadBuffer(gl: WebGL2RenderingContext): IndexedBufferDrawable {
  const drawable = new IndexedBufferDrawable(gl);
  drawable.mapPositions([{ location: 0, size: 2 }]).setdata(new Float32Array(VERTICES));
  drawable.setIndices(new Uint8Array(INDICES));
  return drawable;
}
