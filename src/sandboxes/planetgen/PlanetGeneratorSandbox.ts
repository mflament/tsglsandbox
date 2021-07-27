import {AbstractThreeSandbox, OrbitControls, SandboxContainer, SandboxFactory} from 'gl';
import {AmbientLight, DirectionalLight} from 'three';
import {Planet} from "./Planet";
import {PlanetGenerator, PlanetGeneratorSettings} from "./PlanetGenerator";
import {PlanetBuffers} from "./PlanetBuffers";

class PGParameters extends PlanetGeneratorSettings {
  wireframe = false;
}

export class PlanetGeneratorSandbox extends AbstractThreeSandbox<PGParameters> {
  static async create(container: SandboxContainer, name: string, parameters?: PGParameters): Promise<PlanetGeneratorSandbox> {
    return new PlanetGeneratorSandbox(container, name, parameters);
  }

  readonly displayName = "Planet Generator";
  readonly orbitControls: OrbitControls;

  private planet: Planet;

  constructor(container: SandboxContainer, name: string, parameters?: PGParameters) {
    super(container, name, parameters);


    console.log((this.renderer as any).attributes)
    this.camera.position.z = 2;
    this.orbitControls = new OrbitControls(this.camera, container.canvas.element);
    this.orbitControls.update();

    this.createLights()

    this.planet = new Planet(this.parameters.color);
    this.scene.add(this.planet.mesh);
    this.generatePlanet();
  }

  createDefaultParameters(): PGParameters {
    return new PGParameters();
  }

  private createLights(): void {
    this.scene.add(new AmbientLight(0xffffff, 1));
    const light = new DirectionalLight(0xffffff, 0.6);
    light.position.set(50, 50, 100);
    light.target.position.z = 5;
    this.scene.add(light);
    this.scene.add(light.target);
  }

  onparameterchange(): void {
    this.generatePlanet();
    this.planet.color = this.parameters.color;
    this.planet.wireframe = this.parameters.wireframe;
  }

  delete(): void {
    this.orbitControls.dispose();
    super.delete();
  }

  private generatePlanet() {
    const planetBuffers = new PlanetBuffers(this.parameters.resolution);
    const planetGenerator = new PlanetGenerator(planetBuffers, this.parameters);
    planetGenerator.generate()
    this.planet.update(planetBuffers);
  }
}

export function planetGeneratorSandbox(): SandboxFactory {
  return PlanetGeneratorSandbox.create;
}
