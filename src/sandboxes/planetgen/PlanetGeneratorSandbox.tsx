import React from 'react';
import {AbstractThreeSandbox, control, OrbitControls, SandboxContainer, SandboxFactory} from 'gl';
import {AmbientLight, DirectionalLight} from 'three';
import {Planet} from "./Planet";
import {PlanetGeneratorPrograms, ShaderPlanetVerticesGenerator} from "./ShaderPlanetVerticesGenerator";
import {newPlanetGenerator, PlanetGenerator, PlanetGeneratorSettings,} from "./PlanetGenerator";
import {JSPlanetVerticesGenerator} from "./JSPlanetVerticesGenerator";
import {SandboxParameter} from "../../gl/sandbox/SandboxParameter";
import {TriangleStripPlanetIndicesGenerator} from "./TriangleStripPlanetIndicesGenerator";

class PGParameters extends PlanetGeneratorSettings {
  @control({order: 0})
  texture = false;
  @control({order: 1})
  wireframe = false;
}

export class PlanetGeneratorSandbox extends AbstractThreeSandbox<PGParameters> {
  static async create(container: SandboxContainer, name: string, parameters?: PGParameters): Promise<PlanetGeneratorSandbox> {
    return new PlanetGeneratorSandbox(container, name, parameters, await ShaderPlanetVerticesGenerator.loadPrograms(container.programLoader));
  }

  readonly displayName = "Planet Generator";

  private readonly orbitControls: OrbitControls;
  private readonly generator;
  private planet: Planet;

  constructor(container: SandboxContainer, name: string, parameters: PGParameters | undefined, readonly programs: PlanetGeneratorPrograms) {
    super(container, name, parameters);

    this.camera.position.z = 2;
    this.orbitControls = new OrbitControls(this.camera, container.canvas.element);
    this.orbitControls.update();

    this.createLights()

    this.planet = new Planet();
    this.scene.add(this.planet.mesh);

    this.generator = this.newGenerator();
    this.onparameterchange();
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

  onparameterchange(p?: SandboxParameter): void {
    if (!p || PlanetGeneratorSandbox.shouldUpdateShape(p)) {
      this.generatePlanet();
    }
    if (!p || p.name === 'color')
      this.planet.color = this.parameters.color;
    if (!p || p.name === 'texture')
      this.planet.texture = this.parameters.texture;
    if (!p || p.name === 'wireframe')
      this.planet.wireframe = this.parameters.wireframe;
  }

  private static shouldUpdateShape(p: SandboxParameter): boolean {
    return p.name === 'resolution' || p.name === 'shapeType' || p.parent?.name === 'terrain';
  }

  delete(): void {
    this.planet.delete();
    this.orbitControls.dispose();
    super.delete();
  }

  private generatePlanet() {
    const buffers = this.generator.generate(this.parameters);
    this.planet.updateMesh(buffers);
    this.updateControls();
  }

  customControls(): JSX.Element | undefined {
    return <>
      <label>Vertices</label>
      <span>{this.vertices}</span>
      <label>Triangles</label>
      <span>{this.triangles}</span>
    </>;
  }

  private get vertices(): string {
    return this.planet.vertices.toLocaleString();
  }

  private get triangles(): string {
    return this.planet.triangles.toLocaleString();
  }

  private newGenerator(): PlanetGenerator {
    // return new ShaderPlanetGenerator(this.gl, this.programs.generatePositions, this.renderer);
    return newPlanetGenerator(new TriangleStripPlanetIndicesGenerator(), new JSPlanetVerticesGenerator());
  }
}

export function planetGeneratorSandbox(): SandboxFactory {
  return PlanetGeneratorSandbox.create;
}
