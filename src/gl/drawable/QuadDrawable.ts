import {vec2} from 'gl-matrix';
import {IndexedDrawable} from "./GLDrawable";
import {VertexBuffer} from "../buffers/VertexBuffer";
import {ByteIndexBuffer} from "../buffers/IndexBuffer";
import {DrawMode} from "../buffers/BufferEnums";
import {Program} from "../shader/Program";
import {ProgramLoader, ShadersConfiguration} from "../shader/ProgramLoader";

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

export function newQuadDrawable(gl: WebGL2RenderingContext): IndexedDrawable {
  const vertices = new VertexBuffer(gl, { a_position: { size: 2 } }).bind().setdata(VERTICES);
  const indices = new ByteIndexBuffer(gl).bind().setdata(new Uint8Array(INDICES));
  return new IndexedDrawable(gl, { buffer: vertices, locations: { a_position: 0 } }, DrawMode.TRIANGLES, indices);
}

export interface QuadProgram<U = any, B = any, A = any> extends Program<U, B, A> {
  aspectRatio(ar: number): void;
  use(): QuadProgram<U, B, A>;
}

type QuadProgramConfiguration<U, B, A> = Omit<ShadersConfiguration<U, B, A>, 'vspath'>;

export async function quadProgram<U = any, B = any, A = any>(
  programLoader: ProgramLoader,
  configuration: QuadProgramConfiguration<U, B, A>
): Promise<QuadProgram<U>> {
  const program = (await programLoader.load({
    ...configuration,
    vspath: QUAD_VS
  })) as QuadProgram<U>;
  program.use();
  const transformLocation = program.uniformLocation('u_transform');
  program.aspectRatio = ar => {
    const scale = vec2.create();
    if (ar > 1) {
      vec2.set(scale, 1 / ar, 1);
    } else if (ar < 1) {
      vec2.set(scale, 1, ar);
    } else {
      vec2.set(scale, 1, 1);
    }
    program.gl.uniform2f(transformLocation, scale[0], scale[1]);
  };
  program.aspectRatio(1);
  return program;
}
