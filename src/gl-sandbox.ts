import { IndexBuffer, VertexBuffer, VertextArray } from './gl-buffers';
import { Program } from './gl-shader';

export interface Dimension {
  width: number;
  height: number;
}

export interface GLSandbox {
  render(): void;
  setup?: (gl: WebGL2RenderingContext, dimension: Dimension) => Promise<void>;
  resize?: (dimension: Dimension) => void;
  onmousemove?: (event: MouseEvent) => void;
  onmouseup?: (event: MouseEvent) => void;
  onmousedown?: (event: MouseEvent) => void;
  onwheel?: (event: WheelEvent) => void;
  onkeydown?: (event: KeyboardEvent) => void;
  onkeyup?: (event: KeyboardEvent) => void;
}

export abstract class AbstractGLSandbox implements GLSandbox {
  private _gl?: WebGL2RenderingContext;
  private _dimension?: Dimension;

  protected loadResource?: () => Promise<void>;

  abstract render(): void;

  async setup(gl: WebGL2RenderingContext, dimension: Dimension): Promise<void> {
    this._gl = gl;
    this._dimension = dimension;
    if (this.loadResource) return this.loadResource();
  }

  resize(dimension: Dimension): void {
    this._dimension = dimension;
  }

  protected get gl(): WebGL2RenderingContext {
    if (!this._gl) throw new Error('Setup not yet called');
    return this._gl;
  }

  protected get dimension(): Dimension {
    if (!this._dimension) throw new Error('Setup not yet called');
    return this._dimension;
  }

  protected newQuadBuffer(): QuadBuffer {
    return new QuadBuffer(this.gl);
  }

  protected async loadProgram(vsSource: string, fsSource: string, varyings?: string[]): Promise<Program> {
    const vss = await this.loadShaderSource(vsSource);
    const fss = await this.loadShaderSource(fsSource);
    return new Program({
      gl: this.gl,
      vsSource: vss,
      fsSource: fss,
      varyings: varyings
    });
  }

  private async loadShaderSource(source: string): Promise<string> {
    if (source.startsWith('#')) {
      const elementId = source.substring(1);
      const element = document.getElementById(elementId);
      if (!element?.textContent) throw new Error('Shader source element ' + elementId + ' not found');
      return element.textContent.trimStart();
    }

    if (source.indexOf('\n') < 0) {
      // 1 line, an url or relative path perhaps ?
      return await new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('GET', source);
        request.responseType = 'text';
        request.onload = () => {
          if (request.status === 200) resolve(request.responseText);
          else reject(request.status);
        };
        request.onerror = e => reject(e);
        request.send();
      });
    }

    return source;
  }
}

export class QuadBuffer {
  static readonly VERTICES = [-1, 1, 1, 1, 1, -1, -1, -1];
  static readonly INDICES = [3, 1, 0, 3, 2, 1];

  private readonly vao: VertextArray;
  private readonly vbo: VertexBuffer;
  private readonly ibo: IndexBuffer;

  constructor(readonly gl: WebGL2RenderingContext) {
    this.vao = new VertextArray(gl).bind();

    this.vbo = new VertexBuffer(gl).bind().data(new Float32Array(QuadBuffer.VERTICES));
    this.vao.withAttribute(0, 2, WebGL2RenderingContext.FLOAT);

    this.ibo = new IndexBuffer(gl).bind().data(new Uint8Array(QuadBuffer.INDICES));

    this.unbind();
  }

  bind(): void {
    this.vbo.bind();
    this.ibo.bind();
    this.vao.bind();
  }

  unbind(): void {
    this.vbo.unbind();
    this.ibo.unbind();
    this.vao.unbind();
  }

  draw(): void {
    this.ibo.draw();
  }
}
