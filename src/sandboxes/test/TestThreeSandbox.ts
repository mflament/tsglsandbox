import { AbstractThreeSandbox, OrbitControls, SandboxContainer, SandboxFactory } from 'gl';
import {
  AmbientLight,
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  WebGLRenderer,
  WebGLRendererParameters
} from 'three';

class TestThreeSandbox extends AbstractThreeSandbox {
  static readonly factory = AbstractThreeSandbox.sandboxFactory(TestThreeSandbox.create);

  private static async create(
    container: SandboxContainer,
    renderer: WebGLRenderer,
    name: string
  ): Promise<TestThreeSandbox> {
    return new TestThreeSandbox(container, renderer, name, {});
  }

  private readonly cube: Mesh;

  readonly displayName = 'Three.js test';
  readonly orbitControls: OrbitControls;
  private readonly pointLight: PointLight;

  constructor(container: SandboxContainer, renderer: WebGLRenderer, name: string, parameters: WebGLRendererParameters) {
    super(container, renderer, name, parameters);
    const geometry = new BoxGeometry();
    const material = new MeshStandardMaterial({ color: 0x00ff00 });
    this.cube = new Mesh(geometry, material);
    this.scene.add(this.cube);
    this.scene.add(new AmbientLight(0x404040));

    this.pointLight = new PointLight(0xffff00, 1, 10);
    this.pointLight.position.set(2, 2, 2);
    this.scene.add(this.pointLight);

    this.camera.position.z = 2;
    this.orbitControls = new OrbitControls(this.camera, container.canvas.element);
  }

  createDefaultParameters(): any {
    return {};
  }

  update(): void {
    this.cube.rotation.x += 0.03;
    this.cube.rotation.y += 0.03;
  }

  delete(): void {
    this.orbitControls.dispose();
    super.delete();
  }
}

export function testThree(): SandboxFactory {
  return TestThreeSandbox.factory;
}
