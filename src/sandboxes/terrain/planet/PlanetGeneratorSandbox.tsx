import React from 'react';
import { AbstractThreeSandbox, control, ISandboxParameter, OrbitControls, SandboxContainer, SandboxFactory } from 'gl';
import { AmbientLight, PointLight, Texture, TextureLoader, WebGLRenderer } from 'three';
import { Planet } from './Planet';
import { BasicPlanetMaterial, PlanetMaterial } from './PlanetMaterial';
import { DefaultPlanetGeneratorSettings, MAX_RESOLUTION } from './PlanetGeneratorSettings';
import { DefaultPlanetGenerator, PlanetGenerator } from './generator/PlanetGenerator';
import { CancellablePromise } from './generator/CancellablePromise';

class PGParameters extends DefaultPlanetGeneratorSettings {
  @control({ order: 0 })
  texture = false;
  @control({ order: 1 })
  wireframe = false;
}

export class PlanetGeneratorSandbox extends AbstractThreeSandbox<PGParameters> {
  static readonly factory = AbstractThreeSandbox.sandboxFactory(PlanetGeneratorSandbox.create);

  private static async create(
    container: SandboxContainer,
    renderer: WebGLRenderer,
    name: string,
    parameters?: PGParameters
  ): Promise<PlanetGeneratorSandbox> {
    // const material = await ShaderPlanetMaterial.load(container.shaderLoader);
    const material = new BasicPlanetMaterial();
    return new PlanetGeneratorSandbox(container, renderer, name, parameters, material);
  }

  readonly displayName = 'Planet Generator';

  private readonly planet: Planet;
  private readonly orbitControls: OrbitControls;
  private readonly generator: PlanetGenerator;

  private generatorPromise?: CancellablePromise<void | 'cancelled'>;

  private planetTexture?: Texture;
  private lastGenerationTime = 0;

  constructor(
    container: SandboxContainer,
    renderer: WebGLRenderer,
    name: string,
    parameters: PGParameters | undefined,
    readonly planetMaterial: PlanetMaterial
  ) {
    super(container, renderer, name, parameters);

    this.camera.position.z = 2;
    this.orbitControls = new OrbitControls(this.camera, container.canvas.element);
    this.orbitControls.update();

    this.createLights();

    const loader = new TextureLoader();
    loader.load('images/earth.png', t => this.textureLoaded(t));

    this.generator = new DefaultPlanetGenerator();
    this.planet = new Planet(this.planetMaterial, MAX_RESOLUTION, this.parameters.triangleStrip);
    this.scene.add(this.planet.mesh);

    this.onparameterchange();
  }

  private textureLoaded(t: Texture): void {
    this.planetTexture = t;
    if (this.parameters.texture) this.planetMaterial.setTexture(t);
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

  onparameterchange(p?: ISandboxParameter): void {
    if (this.generatorPromise) {
      this.generatorPromise.cancel();
      this.generatorPromise = undefined;
    }

    if (PlanetGeneratorSandbox.shouldUpdateShape(p)) {
      this.generatorPromise = this.generatePlanet().then(() => this.updateMesh(p));
    } else {
      this.updateMesh(p);
    }
  }

  private updateMesh(p?: ISandboxParameter): void {
    if (!p || p.name === 'color') this.planetMaterial.setColor(this.parameters.color);
    if (!p || p.name === 'triangleStrip') this.planet.triangleStrip = this.parameters.triangleStrip;
    if (!p || p.name === 'texture')
      this.planetMaterial.setTexture(this.parameters.texture && this.planetTexture ? this.planetTexture : null);
    if (!p || p.name === 'wireframe') this.planetMaterial.wireframe = this.parameters.wireframe;
  }

  delete(): void {
    this.planet.delete();
    this.orbitControls.dispose();
    super.delete();
  }

  private generatePlanet(): CancellablePromise<void> {
    const start = performance.now();
    return this.generator.generate(this.parameters, this.planet).then(
      () => {
        this.lastGenerationTime = performance.now() - start;
        this.updateControls();
      },
      error => {
        if (error !== 'cancelled') {
          console.error('Error generating planet', error);
        }
      }
    );
  }

  customControls(): JSX.Element | undefined {
    return (
      <>
        <label>Vertices</label>
        <span>{this.vertices}</span>
        <label>Indices</label>
        <span>{this.indices}</span>
        <label>Generated in</label>
        <span>{this.lastGenerationTime.toLocaleString() + 'ms'}</span>
      </>
    );
  }

  private get vertices(): string {
    return this.planet.vertexCount.toLocaleString();
  }

  private get indices(): string {
    return this.planet.indexCount.toLocaleString();
  }

  private static shouldUpdateShape(p?: ISandboxParameter): boolean {
    return (
      !p ||
      p.name === 'resolution' ||
      p.name === 'triangleStrip' ||
      p.name === 'shapeType' ||
      p.parent?.name === 'terrain'
    );
  }
}

export function planetGeneratorSandbox(): SandboxFactory {
  return PlanetGeneratorSandbox.factory;
}
