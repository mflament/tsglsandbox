import { AbstractGLSandbox } from './AbstractGLSandbox';
import { Camera, PerspectiveCamera, Scene, WebGLRenderer, WebGLRendererParameters, OrbitControls } from 'three';
import { SandboxContainer, SandboxFactory } from '../GLSandbox';

export type ThreeSandboxFactory<P = any> = (
  container: SandboxContainer,
  renderer: WebGLRenderer,
  name: string,
  parameters?: P
) => Promise<AbstractThreeSandbox<P>>;

export abstract class AbstractThreeSandbox<P = any> extends AbstractGLSandbox<P> {
  protected static sandboxFactory<P = any>(f: ThreeSandboxFactory<P>): SandboxFactory<P> {
    return (container, name, parameters) => {
      const renderer = new WebGLRenderer({ canvas: container.canvas.element, ...parameters });
      return f(container, renderer, name, parameters);
    };
  }

  protected readonly scene: Scene;
  protected readonly camera: Camera;

  protected constructor(
    container: SandboxContainer,
    protected readonly renderer: WebGLRenderer,
    name: string,
    parameters?: P & WebGLRendererParameters
  ) {
    super(container, name, parameters);
    // this.renderer = new WebGLRenderer({ canvas: container.canvas.element, ...parameters });
    this.scene = new Scene();
    this.camera = this.createCamera();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  protected createCamera(): Camera {
    return new PerspectiveCamera(75, this.canvas.aspectRatio, 0.1, 1000);
  }

  delete(): void {
    super.delete();
    this.renderer.dispose();
  }

  onresize(dimension: { width: number; height: number }): void {
    if (this.camera instanceof PerspectiveCamera) {
      this.renderer.setSize(dimension.width, dimension.height, false);
      this.camera.aspect = dimension.width / dimension.height;
      this.camera.updateProjectionMatrix();
    }
  }
}

export { OrbitControls };
