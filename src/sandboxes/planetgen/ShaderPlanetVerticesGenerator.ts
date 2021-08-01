import {
  BufferTarget,
  checkNull,
  DrawMode,
  GLDrawable,
  Program,
  ProgramLoader,
  TransformFeedback,
  TransformFeedbackDrawMode,
  VaryingBufferMode,
  VertexBuffer,
  VertexComponentType
} from "gl";
import {InterleavedBuffer, WebGLRenderer} from "three";
import {
  mainFacesVertices,
  PlanetGeneratorSettings,
  planetVertices,
  PlanetVerticesGenerator,
  sideFacesVertices
} from "./PlanetGenerator";
import {VERTEX_SIZE} from "./Vertices";

export interface PlanetGeneratorPrograms {
  generatePositions: Program<GeneratorUniforms>
}

class GeneratorUniforms {
  resolution: WebGLUniformLocation | null = null;
  faceVertices: WebGLUniformLocation | null = null;
  mode: WebGLUniformLocation | null = null;// CUBE,SPHERE,TERRAIN
}

export class ShaderPlanetVerticesGenerator implements PlanetVerticesGenerator {

  static async loadPrograms(loader: ProgramLoader): Promise<PlanetGeneratorPrograms> {
    const updatePositions = await loader.load({
      path: 'planetgenerator/generate-pos.glsl',
      uniformLocations: new GeneratorUniforms(),
      varyingMode: VaryingBufferMode.INTERLEAVED
    });
    return {generatePositions: updatePositions};
  }

  constructor(readonly gl: WebGL2RenderingContext,
              readonly program: Program<GeneratorUniforms>,
              readonly webglRenderer: WebGLRenderer) {
  }

  generate(config: PlanetGeneratorSettings, buffer?: InterleavedBuffer): InterleavedBuffer {
    const vertexCount = planetVertices(config.resolution);
    let vertexBuffer: WebGLBuffer;
    if (!buffer || buffer.array.length < vertexCount * VERTEX_SIZE) {
      if (buffer)
        this.webglRenderer.attributes.remove(buffer as any);

      buffer = new InterleavedBuffer(new Float32Array(vertexCount * VERTEX_SIZE), VERTEX_SIZE);
      vertexBuffer = checkNull(this.gl.createBuffer);
      this.gl.bindBuffer(BufferTarget.ARRAY_BUFFER, vertexBuffer);
      this.webglRenderer.attributes.set(buffer as any, {
        buffer: vertexBuffer,
        type: VertexComponentType.FLOAT,
        version: buffer.version,
        bytesPerElement: Float32Array.BYTES_PER_ELEMENT
      });
    } else {
      vertexBuffer = this.webglRenderer.attributes.get(buffer as any).buffer;
      buffer.length = vertexCount * VERTEX_SIZE;
    }

    const inputs = new VertexBuffer(this.gl, {'position': {type: VertexComponentType.FLOAT, size: 2}});
    inputs.bind().allocate(4 * 2 * vertexCount);
    const drawable = new GLDrawable(this.gl, {buffer: inputs}, DrawMode.POINTS);
    drawable.bind();

    this.gl.useProgram(this.program.glprogram);
    const {mainVertices, sideVertices} = {
      mainVertices: mainFacesVertices(config.resolution),
      sideVertices: sideFacesVertices(config.resolution)
    };
    this.gl.uniform1i(this.program.uniformLocations.mode, mode(config.shapeType));
    this.gl.uniform1i(this.program.uniformLocations.resolution, config.resolution);
    this.gl.uniform2i(this.program.uniformLocations.faceVertices, mainVertices, sideVertices);

    const tf = new TransformFeedback(this.gl);
    tf.bind().bindBuffer(0, vertexBuffer);
    this.gl.enable(WebGL2RenderingContext.RASTERIZER_DISCARD);
    tf.begin(TransformFeedbackDrawMode.POINTS);
    drawable.draw();
    tf.end();
    this.gl.disable(WebGL2RenderingContext.RASTERIZER_DISCARD);
    tf.unbindBuffer(0).unbind();

    // const target = BufferTarget.ARRAY_BUFFER;
    // this.gl.bindBuffer(target, vertexBuffer);
    // const capture = new Float32Array(vertexCount * VERTEX_SIZE);
    // this.gl.getBufferSubData(target, 0, capture, 0);
    // console.log(capture);

    tf.delete();
    drawable.delete();

    // this._vertices.needsUpdate = true;
    this.webglRenderer.resetState();

    return buffer;
  }
}

function mode(type: 'cube' | 'sphere' | 'terrain'): number {
  switch (type) {
    case "cube":
      return 0;
    case "sphere":
      return 1;
    case "terrain":
      return 2;
  }
}
