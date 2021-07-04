import {
  AbstractGLSandbox,
  SandboxContainer,
  SandboxFactory,
  GLTexture2D,
  InternalFormat,
  TextureFormat,
  TextureWrappingMode,
  TextureMinFilter,
  TextureMagFilter,
  TextureComponentType,
  IndexedDrawable,
  newQuadDrawable,
  quadProgram,
  QuadProgram
} from 'gl';
import { vec2 } from 'gl-matrix';
import { Matrix, RNN } from 'rnn';
import { RNG, simplexNoise2D } from 'random';
import { hashLocation } from 'utils';
import { AbstractDeletable } from '../../gl/GLUtils';

class FlowerParameters {
  count = 100;
}

const SIZE = 100;
const DIM: vec2 = [SIZE, SIZE];
const SEED = 'abcde';

enum Mode {
  FLOWERS = 0,
  PREDS = 1,
  SAMPLES_ONLY = 2
}

const newMatrix = Matrix.float32Factory;

class RenderUniforms {
  u_flowers: WebGLUniformLocation | null = null;
  u_textures: WebGLUniformLocation | null = null;
  u_mode: WebGLUniformLocation | null = null;
}

type Updatbale = { update: () => void };

class FlowersSandbox extends AbstractGLSandbox<FlowerParameters> {
  static async create(container: SandboxContainer, name: string): Promise<FlowersSandbox> {
    const parameters = new FlowerParameters();
    hashLocation.parseParams(parameters);
    const renderProgram = await quadProgram(container.programLoader, {
      fspath: 'flowers/render-flowers.fs.glsl',
      uniformLocations: new RenderUniforms()
    });
    return new FlowersSandbox(container, name, parameters, renderProgram);
  }

  private readonly inputs: FlowersInputs;
  private readonly quad: IndexedDrawable;
  private readonly flowersTexture: FlowersTexture;

  readonly overlay: { content: HTMLElement; accuracy: HTMLElement };

  private rnn: RNN;
  private mode: Mode = Mode.PREDS;
  private dirty = true;

  constructor(
    container: SandboxContainer,
    name: string,
    parameters: FlowerParameters,
    readonly renderProgram: QuadProgram<RenderUniforms>
  ) {
    super(container, name, parameters);
    this.inputs = FlowersInputs.create(DIM, SEED);
    this.flowersTexture = new FlowersTexture(this.gl, 0);

    this.quad = newQuadDrawable(this.gl).bind();
    renderProgram.use();
    this.gl.uniform1i(renderProgram.uniformLocations.u_flowers, 0);
    this.gl.uniform1i(renderProgram.uniformLocations.u_textures, 1);
    this.gl.uniform1i(this.renderProgram.uniformLocations.u_mode, this.mode);

    //this.rnn = RNN.create({ layers: [2, 2], seed: SEED });
    this.rnn = RNN.create({ layers: [2, 3, 3, 2], seed: SEED });

    this.overlay = this.createOverlay();

    this.pickSamples();
    this.ups = 30;
  }

  get overlayContent(): HTMLElement {
    return this.overlay.content;
  }

  render(): void {
    super.clear([0, 0, 0, 1]);
    if (this.dirty) {
      this.predict();
      this.dirty = false;
    }
    this.quad.draw();
  }

  update(): void {
    this.train();
  }

  onresize(): void {
    this.renderProgram.aspectRatio(this.container.canvas.aspectRatio);
  }

  onparameterchange(): void {
    if (this.parameters.count != this.inputs.samplesCount) this.pickSamples();
  }

  onkeydown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    switch (key) {
      case 'm':
        this.mode++;
        if (this.mode > 2) this.mode = 0;
        this.gl.uniform1i(this.renderProgram.uniformLocations.u_mode, this.mode);
        break;
    }
  }

  private createOverlay(): { content: HTMLElement; accuracy: HTMLElement } {
    const overlayContent = document.createElement('div');

    const accuracyDiv = document.createElement('div');
    accuracyDiv.classList.add('accuracy');
    const accuracyLabel = document.createElement('label');
    accuracyLabel.textContent = 'Accuracy';
    accuracyDiv.appendChild(accuracyLabel);

    const accuracyValue = document.createElement('span');
    accuracyDiv.appendChild(accuracyValue);

    overlayContent.appendChild(accuracyDiv);

    this.rnn.layers.map(layer => {
      const layerDiv = document.createElement('div');
      layerDiv.classList.add('layer');
      for (let output = 0; output < layer.outputs; output++) {
        const neuronDiv = document.createElement('div');
        neuronDiv.classList.add('neuron');

        neuronDiv.appendChild(this.createControl('bias', 'Bias', layer.biases, 0, output));

        const weightsDiv = document.createElement('div');
        weightsDiv.classList.add('weights');
        for (let input = 0; input < layer.inputs; input++) {
          weightsDiv.appendChild(this.createControl('weight', 'Weights ' + input, layer.weights, input, output));
        }
        neuronDiv.appendChild(weightsDiv);

        layerDiv.appendChild(neuronDiv);
      }
      overlayContent.appendChild(layerDiv);
    });
    return { content: overlayContent, accuracy: accuracyValue };
  }

  private createControl(
    cssClass: string,
    label: string,
    source: Matrix,
    row: number,
    col: number
  ): HTMLElement & Updatbale {
    const div = document.createElement('div') as any;
    div.classList.add('layerinput', cssClass);

    const labelDiv = document.createElement('label');
    labelDiv.textContent = label;
    div.appendChild(labelDiv);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '-1';
    input.max = '1';
    input.step = '0.01';
    input.value = source.get(row, col).toString();
    input.oninput = () => {
      source.set(row, col, parseFloat(input.value));
      value.textContent = input.value;
      this.dirty = true;
    };
    div.appendChild(input);

    const value = document.createElement('span');
    value.textContent = input.value;
    div.appendChild(value);

    div.update = () => {
      input.value = source.get(row, col).toString();
      value.textContent = input.value;
    };
    return div;
  }

  private pickSamples(): void {
    this.inputs.pick(this.parameters.count, SEED);
    this.flowersTexture.update(this.inputs);
  }

  private predict(): void {
    const accuracy = this.inputs.predict(this.rnn);
    this.overlay.accuracy.textContent = (accuracy * 100).toFixed(1) + '%';
    this.flowersTexture.update(this.inputs);
  }

  private train(): void {
    this.inputs.train(this.rnn, 1);
    const inputs = this.overlay.content.querySelectorAll('.layerinput');
    inputs.forEach(e => (e as unknown as Updatbale).update());
    this.dirty = true;
  }
}

class FlowersInputs {
  static create(dim: vec2, seed?: string, noiseScale = 1.3): FlowersInputs {
    const count = dim[0] * dim[1];
    const samples = newMatrix(count, 2);
    const targets = newMatrix(count, 1);
    const noiseSeed = new RNG(seed).random(0, 2 ^ 32);
    const noise = simplexNoise2D(noiseSeed);

    const size: vec2 = [1 / dim[0], 1 / dim[1]];
    const halfSize = vec2.scale(vec2.create(), size, 0.5);
    const pos = vec2.create();
    let sample = 0;
    for (let y = 0; y < dim[1]; y++) {
      for (let x = 0; x < dim[0]; x++) {
        vec2.add(pos, vec2.mul(pos, vec2.set(pos, x, y), size), halfSize);
        samples.setRow(sample, pos);

        vec2.scale(pos, vec2.div(pos, vec2.set(pos, x, y), dim), noiseScale);
        const type = noise(pos) >= 0 ? 1 : 0;
        targets.set(sample, 0, type);
        sample++;
      }
    }
    return new FlowersInputs(samples, targets, dim);
  }

  readonly sampleIndices: Matrix = newMatrix(0, 1);
  outputs?: Matrix;

  private constructor(readonly flowers: Matrix, readonly targets: Matrix, readonly dim: vec2) {}

  get count(): number {
    return this.flowers.rows;
  }

  get samplesCount(): number {
    return this.sampleIndices.rows;
  }

  pick(count: number, seed?: string): void {
    const pickeds = new Array(this.count);
    const rng = new RNG(seed);
    const remanings = [count / 2, count / 2 - (count % 2)];
    let target = -1;
    const indices: number[] = [];
    for (let c = 0; c < count; c++) {
      let index = -1;
      let retry = 0;
      while (retry < 5) {
        index = rng.random(0, this.count);
        if (pickeds[index] === undefined) {
          target = this.targets.get(index, 0);
          if (remanings[target]) break;
        }
        index = -1;
        retry++;
      }

      if (index >= 0) {
        pickeds[index] = 1;
        remanings[target]--;
        indices.push(index);
      }
    }
    this.sampleIndices.reshape(indices.length, 1);
    this.sampleIndices.fill(r => indices[r]);
  }

  predict(rnn: RNN): number {
    this.outputs = rnn.eval(this.flowers);
    let matcheds = 0;
    for (let sample = 0; sample < this.outputs.rows; sample++) {
      const actual = this.outputs.maxIndex(sample);
      const expected = this.targets.get(sample, 0);
      if (expected === actual) matcheds++;
    }
    return matcheds / this.count;
  }

  train(rnn: RNN, learningRate = 1): void {
    const samples = newMatrix(this.samplesCount, 2);
    const targets = newMatrix(this.samplesCount, 2);
    for (let sample = 0; sample < this.samplesCount; sample++) {
      const sampleIndex = this.sampleIndices.get(sample, 0);
      samples.set(sample, 0, this.flowers.get(sample, 0));
      samples.set(sample, 1, this.flowers.get(sample, 1));

      const target = this.targets.get(sampleIndex, 0);
      targets.set(sample, 0, target === 0 ? 1 : 0);
      targets.set(sample, 1, target === 1 ? 1 : 0);
    }
    rnn.train(samples, targets, learningRate);
  }
}

class FlowersTexture extends AbstractDeletable {
  readonly texture: GLTexture2D;

  constructor(gl: WebGL2RenderingContext, readonly textureUnit: number) {
    super();
    this.texture = new GLTexture2D(gl)
      .activate(textureUnit)
      .bind()
      .wrap(TextureWrappingMode.CLAMP_TO_EDGE)
      .minFilter(TextureMinFilter.NEAREST)
      .magFilter(TextureMagFilter.NEAREST);
  }

  bind(): FlowersTexture {
    this.texture.activate(this.textureUnit).bind();
    return this;
  }

  get dim(): vec2 {
    return [this.texture.width, this.texture.height];
  }

  update(inputs: FlowersInputs): void {
    const dim = inputs.dim;
    const flowers = inputs.flowers;
    const targets = inputs.targets;
    const outputs = inputs.outputs;
    const pos = vec2.create();
    const array = new Uint8Array(dim[0] * dim[1] * PIXEL_SIZE);

    for (let index = 0; index < inputs.count; index++) {
      flowers.getRow(index, pos);
      const target = targets.get(index, 0);
      const offset = this.pixelOffset(pos, dim);
      array[offset] = target;
      if (outputs && index < outputs.rows) {
        array[offset + 1] = outputs.maxIndex(index);
      }
    }

    const sampleIndices = inputs.sampleIndices;
    for (let index = 0; index < sampleIndices.rows; index++) {
      const sampleIndex = sampleIndices.get(index, 0);
      flowers.getRow(sampleIndex, pos);
      const offset = this.pixelOffset(pos, dim);
      array[offset + 2] = 255;
    }

    this.texture.data({
      buffer: array,
      width: dim[0],
      height: dim[1],
      internalFormat: InternalFormat.RGBA,
      format: TextureFormat.RGBA,
      type: TextureComponentType.UNSIGNED_BYTE
    });
  }

  private pixelOffset(pos: vec2, dim: vec2): number {
    vec2.floor(pos, vec2.mul(pos, pos, dim));
    return pos[1] * dim[0] * PIXEL_SIZE + pos[0] * PIXEL_SIZE;
  }

  delete(): void {
    this.texture.delete();
    super.delete();
  }
}

export function flowers(): SandboxFactory<FlowerParameters> {
  return FlowersSandbox.create;
}

const PIXEL_SIZE = 4;
