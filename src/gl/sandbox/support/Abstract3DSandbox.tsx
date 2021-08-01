import {AbstractGLSandbox} from "./AbstractGLSandbox";
import {SandboxContainer} from "../GLSandbox";
import {PerspectiveCamera} from "./camera/PerspectiveCamera";

abstract class Abstract3DSandbox<P = any> extends AbstractGLSandbox<P> {

  protected readonly camera = new PerspectiveCamera();

  protected constructor(readonly container: SandboxContainer, readonly name: string, parameters?: P) {
    super(container, name, parameters);
  }

}
