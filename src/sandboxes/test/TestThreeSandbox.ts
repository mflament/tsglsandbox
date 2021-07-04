import { SandboxContainer, AbstractThreeSandbox, SandboxFactory } from 'gl';
import { BoxGeometry, Mesh, MeshBasicMaterial, WebGLRendererParameters } from 'three';

class TestThreeSandbox extends AbstractThreeSandbox {
  static async create(container: SandboxContainer, name: string): Promise<TestThreeSandbox> {
    return new TestThreeSandbox(container, name, {});
  }

  private readonly cube: Mesh;

  constructor(container: SandboxContainer, name: string, parameters: WebGLRendererParameters) {
    super(container, name, parameters);
    const geometry = new BoxGeometry();
    const material = new MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new Mesh(geometry, material);
    this.scene.add(this.cube);
    this.camera.position.z = 5;
  }

  update(): void {
    this.cube.rotation.x += 0.03;
    this.cube.rotation.y += 0.03;
  }
}

export function testThree(): SandboxFactory {
  return TestThreeSandbox.create;
}
