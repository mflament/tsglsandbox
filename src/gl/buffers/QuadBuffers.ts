import { DrawMode } from './BufferEnums';
import { IndexBuffer, VertexBuffer } from './GLBuffers';

import { VertextArray } from './VertextArray';

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
export class QuadBuffers {
  static readonly VERTICES = [-1, 1, 1, 1, 1, -1, -1, -1];
  static readonly INDICES = [3, 1, 0, 3, 2, 1];

  private readonly vao: VertextArray;
  private readonly vbo: VertexBuffer;
  private readonly ibo: IndexBuffer;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.vao = new VertextArray(gl).bind();

    this.vbo = new VertexBuffer(gl).bind().setdata(new Float32Array(QuadBuffers.VERTICES));
    this.vao.withAttribute({ size: 2 });

    this.ibo = new IndexBuffer(gl);
    this.ibo.bind().setdata(new Uint8Array(QuadBuffers.INDICES));
  }

  bind(): QuadBuffers {
    this.vbo.bind();
    this.ibo.bind();
    this.vao.bind();
    return this;
  }

  unbind(): QuadBuffers {
    this.vbo.unbind();
    this.ibo.unbind();
    this.vao.unbind();
    return this;
  }

  draw(): QuadBuffers {
    this.gl.drawElements(DrawMode.TRIANGLES, QuadBuffers.INDICES.length, WebGL2RenderingContext.UNSIGNED_BYTE, 0);
    return this;
  }

  delete(): void {
    this.vbo.delete();
    this.vao.delete();
    this.ibo.delete();
  }
}
