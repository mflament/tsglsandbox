import { IndexedDrawable, newDrawable } from './GLDrawable';

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

// @ts-ignore
import QUAD_VS from 'assets/shaders/quad.vs.glsl';
import { DrawMode } from './BufferEnums';
import { BufferAttribute, VertexBuffer } from './VertexBuffer';
import { ByteIndexBuffer } from './IndexBuffer';

interface QuadAttributeLocations {
  a_position: Readonly<BufferAttribute>;
}

export function newQuadDrawable(gl: WebGL2RenderingContext): IndexedDrawable<Uint8Array> {
  const vertices = new VertexBuffer<QuadAttributeLocations>(gl, { a_position: { size: 2 } })
    .bind()
    .setdata(VERTICES);
  const indices = new ByteIndexBuffer(gl).bind().setdata(new Uint8Array(INDICES));
  return newDrawable(gl, vertices, { a_position: 0 }, indices, DrawMode.TRIANGLES);
}

export { QUAD_VS };
