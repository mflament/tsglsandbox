import React from 'react';
import {AbstractThreeSandbox, control, OrbitControls, SandboxContainer, SandboxFactory} from 'gl';
import {AmbientLight, PointLight, Texture, TextureLoader} from 'three';
import {Planet} from "./Planet";
import {SandboxParameter} from "../../gl/sandbox/SandboxParameter";
import {BasicPlanetMaterial, PlanetMaterial} from "./PlanetMaterial";
import {DefaultPlanetGeneratorSettings} from "./PlanetGeneratorSettings";
import {DefaultPlanetGenerator, PlanetGenerator} from "./generator/PlanetGenerator";

class PGParameters extends DefaultPlanetGeneratorSettings {
  @control({order: 0})
  texture = false;
  @control({order: 1})
  wireframe = false;
}

export class PlanetGeneratorSandbox extends AbstractThreeSandbox<PGParameters> {

  static async create(container: SandboxContainer, name: string, parameters?: PGParameters): Promise<PlanetGeneratorSandbox> {
    // const material = await ShaderPlanetMaterial.load();
    const material = new BasicPlanetMaterial();
    // const generator = new DirectPlanetGenerator();
    const generator = new DefaultPlanetGenerator();
    //const generator = await ShaderPlanetGenerator.load(container.canvas.gl, container.programLoader);
    return new PlanetGeneratorSandbox(container, name, parameters, generator, material);
  }

  readonly displayName = "Planet Generator";

  private readonly planet: Planet;
  private readonly orbitControls: OrbitControls;

  private planetTexture?: Texture;
  private lastGenerationTime = 0;

  constructor(container: SandboxContainer,
              name: string, parameters: PGParameters | undefined,
              readonly generator: PlanetGenerator,
              readonly planetMaterial: PlanetMaterial) {
    super(container, name, parameters);

    this.camera.position.z = 2;
    this.orbitControls = new OrbitControls(this.camera, container.canvas.element);
    this.orbitControls.update();

    this.createLights();

    const loader = new TextureLoader();
    loader.load('images/earth.png', t => this.textureLoaded(t));

    this.planet = new Planet(this.planetMaterial);
    this.scene.add(this.planet.mesh);

    this.onparameterchange();
  }

  private textureLoaded(t: Texture): void {
    this.planetTexture = t;
    if (this.parameters.texture)
      this.planetMaterial.setTexture(t);
  }

  createDefaultParameters(): PGParameters {
    return new PGParameters();
  }

  private createLights(): void {
    this.scene.add(new AmbientLight(0xffffff, 1));

    const light = new PointLight(0xffffff, 0.8); // A light that gets emitted from a single point in all directions
    this.camera.add(light); // attach the ligh to the camera
    this.scene.add(this.camera); // add the camera to the scene
  }

  onparameterchange(p?: SandboxParameter): void {
    if (PlanetGeneratorSandbox.shouldUpdateShape(p)) {
      this.generatePlanet().then(() => this.updateMesh(p));
    } else {
      this.updateMesh(p);
    }
  }

  private updateMesh(p?: SandboxParameter): void {
    if (!p || p.name === 'color')
      this.planetMaterial.setColor(this.parameters.color);
    if (!p || p.name === 'texture')
      this.planetMaterial.setTexture(this.parameters.texture && this.planetTexture ? this.planetTexture : null);
    if (!p || p.name === 'wireframe')
      this.planetMaterial.wireframe = this.parameters.wireframe;
  }

  delete(): void {
    this.planet.delete();
    this.orbitControls.dispose();
    super.delete();
  }

  private async generatePlanet(): Promise<void> {
    const start = performance.now();
    if (await this.generator.generate(this.parameters, this.planet) !== 'cancelled') {
      this.lastGenerationTime = performance.now() - start;
      this.updateControls();
    }
  }

  customControls(): JSX.Element | undefined {
    return <>
      <label>Vertices</label>
      <span>{this.vertices}</span>
      <label>Indices</label>
      <span>{this.indices}</span>
      <label>Triangles</label>
      <span>{this.triangles}</span>
      <label>Generated in</label>
      <span>{this.lastGenerationTime.toLocaleString() + 'ms'}</span>
    </>;
  }

  private get vertices(): string {
    return this.planet.vertexCount.toLocaleString();
  }

  private get indices(): string {
    return this.planet.indexCount.toLocaleString();
  }

  private get triangles(): string {
    return this.planet.triangleCount(this.parameters.resolution).toLocaleString();
  }

  private static shouldUpdateShape(p?: SandboxParameter): boolean {
    return !p || p.name === 'resolution' || p.name === 'drawMode' || p.name === 'shapeType' || p.parent?.name === 'terrain';
  }

}

export function planetGeneratorSandbox(): SandboxFactory {
  return PlanetGeneratorSandbox.create;
}
