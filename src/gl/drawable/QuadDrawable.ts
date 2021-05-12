import { IndexedDrawable } from './GLDrawable';

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

export const QUAD_VS = 'quad.vs.glsl';
import { VertexBuffer, ByteIndexBuffer, DrawMode } from '../buffers/GLBuffers';

export function newQuadDrawable(gl: WebGL2RenderingContext): IndexedDrawable {
  const vertices = new VertexBuffer(gl, { a_position: { size: 2 } }).bind().setdata(VERTICES);
  const indices = new ByteIndexBuffer(gl).bind().setdata(new Uint8Array(INDICES));
  return new IndexedDrawable(gl, { buffer: vertices, locations: { a_position: 0 } }, DrawMode.TRIANGLES, indices);
}
