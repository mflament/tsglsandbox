export enum BufferTarget {
  ARRAY_BUFFER = WebGL2RenderingContext.ARRAY_BUFFER,
  ELEMENT_ARRAY_BUFFER = WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER,
  COPY_READ_BUFFER = WebGL2RenderingContext.COPY_READ_BUFFER,
  COPY_WRITE_BUFFER = WebGL2RenderingContext.COPY_WRITE_BUFFER,
  TRANSFORM_FEEDBACK_BUFFER = WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER,
  UNIFORM_BUFFER = WebGL2RenderingContext.UNIFORM_BUFFER,
  PIXEL_PACK_BUFFER = WebGL2RenderingContext.PIXEL_PACK_BUFFER,
  PIXEL_UNPACK_BUFFER = WebGL2RenderingContext.PIXEL_UNPACK_BUFFER
}

export enum BufferUsage {
  STATIC_DRAW = WebGL2RenderingContext.STATIC_DRAW,
  DYNAMIC_DRAW = WebGL2RenderingContext.DYNAMIC_DRAW,
  STREAM_DRAW = WebGL2RenderingContext.STREAM_DRAW,
  STATIC_READ = WebGL2RenderingContext.STATIC_READ,
  DYNAMIC_READ = WebGL2RenderingContext.DYNAMIC_READ,
  STREAM_READ = WebGL2RenderingContext.STREAM_READ,
  STATIC_COPY = WebGL2RenderingContext.STATIC_COPY,
  DYNAMIC_COPY = WebGL2RenderingContext.DYNAMIC_COPY,
  STREAM_COPY = WebGL2RenderingContext.STREAM_COPY
}

export enum DrawMode {
  POINTS = WebGL2RenderingContext.POINTS,
  LINE_STRIP = WebGL2RenderingContext.LINE_STRIP,
  LINE_LOOP = WebGL2RenderingContext.LINE_LOOP,
  LINES = WebGL2RenderingContext.LINES,
  TRIANGLE_STRIP = WebGL2RenderingContext.TRIANGLE_STRIP,
  TRIANGLE_FAN = WebGL2RenderingContext.TRIANGLE_FAN,
  TRIANGLES = WebGL2RenderingContext.TRIANGLES
}

export enum TransformFeedbackDrawMode {
  POINTS = WebGL2RenderingContext.POINTS,
  LINES = WebGL2RenderingContext.LINES,
  TRIANGLES = WebGL2RenderingContext.TRIANGLES
}

export enum VertexComponentType {
  BYTE = WebGL2RenderingContext.BYTE,
  SHORT = WebGL2RenderingContext.SHORT,
  FLOAT = WebGL2RenderingContext.FLOAT,
  UNSIGNED_BYTE = WebGL2RenderingContext.UNSIGNED_BYTE,
  UNSIGNED_SHORT = WebGL2RenderingContext.UNSIGNED_SHORT
}

export enum IndexComponentType {
  UNSIGNED_BYTE = WebGL2RenderingContext.UNSIGNED_BYTE,
  UNSIGNED_SHORT = WebGL2RenderingContext.UNSIGNED_SHORT,
  UNSIGNED_INT = WebGL2RenderingContext.UNSIGNED_INT
}

export function sizeOf(gltype: VertexComponentType | IndexComponentType): number {
  switch (gltype) {
    case WebGL2RenderingContext.BYTE:
    case WebGL2RenderingContext.UNSIGNED_BYTE:
      return 1;
    case WebGL2RenderingContext.SHORT:
    case WebGL2RenderingContext.UNSIGNED_SHORT:
      return 2;
    case WebGL2RenderingContext.UNSIGNED_INT:
    case WebGL2RenderingContext.INT:
    case WebGL2RenderingContext.FLOAT:
      return 4;
    default:
      throw new Error('Unhandled tpye ' + gltype);
  }
}
