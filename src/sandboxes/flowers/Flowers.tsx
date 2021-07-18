// noinspection JSUnusedLocalSymbols

import {
  AbstractDeletable,
  AbstractGLSandbox,
  control,
  GLTexture2D,
  IndexedDrawable,
  InternalFormat,
  newQuadDrawable,
  quadProgram,
  QuadProgram,
  SandboxContainer,
  SandboxFactory,
  TextureComponentType,
  TextureFormat,
  TextureMagFilter,
  TextureMinFilter,
  TextureWrappingMode
} from 'gl';
import React, {ChangeEvent, Component, RefObject} from 'react';
import {vec2} from 'gl-matrix';
import {DefaultRNN, Layer, Matrix, RNN} from 'rnn';
import {RNG, simplexNoise2D} from 'random';

enum Mode {
  PREDS = 0,
  FLOWERS = 1,
  SAMPLES_ONLY = 2
}

class FlowerParameters {
  count = 100;
  @control({
    choices: {
      values: [Mode.PREDS, Mode.FLOWERS, Mode.SAMPLES_ONLY],
      labels: ['Predictions', 'Flowers', 'Samples']
    }
  })
  mode: Mode = Mode.PREDS;
  @control({min: 0.001, max: 10, step: 0.1})
  learningRate = 0.1;
}

const SIZE = 100;
const DIM: vec2 = [SIZE, SIZE];
const SEED = 'abcde';

const newMatrix = Matrix.float32Factory;

class RenderUniforms {
  u_flowers: WebGLUniformLocation | null = null;
  u_textures: WebGLUniformLocation | null = null;
  u_mode: WebGLUniformLocation | null = null;
}

class FlowersSandbox extends AbstractGLSandbox<FlowerParameters> {
  static async create(container: SandboxContainer, name: string): Promise<FlowersSandbox> {
    const renderProgram = await quadProgram(container.programLoader, {
      fspath: 'flowers/render-flowers.fs.glsl',
      uniformLocations: new RenderUniforms()
    });
    return new FlowersSandbox(container, name, renderProgram);
  }

  private readonly inputs: FlowersInputs;
  private readonly quad: IndexedDrawable;
  private readonly flowersTexture: FlowersTexture;

  private readonly customControlsRef: RefObject<NetworkControls>;

  private readonly rnn: RNN;
  private mode: Mode;
  private dirty = true;

  constructor(container: SandboxContainer, name: string, readonly renderProgram: QuadProgram<RenderUniforms>) {
    super(container, name, new FlowerParameters());
    this.inputs = FlowersInputs.create(DIM, linearFlowersGenerator(0.3, 0.2));
    this.flowersTexture = new FlowersTexture(this.gl, 0);
    this.mode = this.parameters.mode;

    this.quad = newQuadDrawable(this.gl).bind();
    renderProgram.use();
    this.gl.uniform1i(renderProgram.uniformLocations.u_flowers, 0);
    this.gl.uniform1i(renderProgram.uniformLocations.u_textures, 1);
    this.gl.uniform1i(renderProgram.uniformLocations.u_mode, this.mode);

    this.rnn = DefaultRNN.create({layers: [2, 2], seed: SEED});
    // this.rnn = DefaultRNN.create({layers: [2, 3, 3, 2], seed: SEED});

    this.customControlsRef = React.createRef();

    this.pickSamples();
    this.ups = 30;
  }

  get customControls(): JSX.Element {
    return (
      <NetworkControls
        network={this.rnn}
        ref={this.customControlsRef}
        onchange={() => (this.dirty = true)}
      />
    );
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
    if (this.parameters.count != this.inputs.samples.count) this.pickSamples();
    if (this.parameters.mode != this.mode) {
      this.mode = this.parameters.mode;
      this.gl.uniform1i(this.renderProgram.uniformLocations.u_mode, this.mode);
    }
  }

  onkeydown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    switch (key) {
      case 'm':
        this.mode++;
        if (this.mode > 2) this.mode = 0;
        this.gl.uniform1i(this.renderProgram.uniformLocations.u_mode, this.mode);
        this.parameters.mode = this.mode;
        this.container.updateControls();
        break;
    }
  }

  private pickSamples(): void {
    this.inputs.pick(this.parameters.count, SEED);
    this.flowersTexture.update(this.inputs);
  }

  private predict(): void {
    this.inputs.predict(this.rnn);
    if (this.customControlsRef.current) this.customControlsRef.current.accuracy = this.inputs.accuracy;
    this.flowersTexture.update(this.inputs);
  }

  private train(): void {
    this.inputs.train(this.rnn, this.parameters.learningRate);
    if (this.customControlsRef.current) this.customControlsRef.current.forceUpdate();
    this.dirty = true;
  }
}

interface NeworkControlsProps {
  network: RNN;

  onchange(): void;
}

class NetworkControls extends Component<NeworkControlsProps, { accuracy: number }> {
  constructor(props: NeworkControlsProps & { accuracy: number }) {
    super(props);
    this.state = {accuracy: 0};
  }

  render(): JSX.Element {
    const layers = this.props.network.layers.map((_layer, index) => (
      <LayerControls layerIndex={index} network={this.props.network} onchange={this.props.onchange}/>
    ));
    return (
      <>
        <div className="rnn-accuracy">
          <label>Accuracy</label>
          <span>{(this.state.accuracy * 100).toFixed(1) + '%'}</span>
        </div>
        {layers}
      </>
    );
  }

  set accuracy(a: number) {
    this.setState({accuracy: a});
  }
}

interface LayerProps extends NeworkControlsProps {
  layerIndex: number;
}

class LayerControls extends Component<LayerProps> {
  constructor(props: LayerProps) {
    super(props);
  }

  get layer(): Layer {
    return this.props.network.layers[this.props.layerIndex];
  }

  render(): JSX.Element {
    const neurons: JSX.Element[] = [];
    const layer = this.layer;
    for (let o = 0; o < layer.outputs; o++) {
      neurons.push(
        <NeuronControls
          network={this.props.network}
          layerIndex={this.props.layerIndex}
          neuronIndex={o}
          onchange={() => this.props.onchange()}
        />
      );
    }
    return (
      <div className="layer">
        <h2>{'Layer ' + (this.props.layerIndex + 1)}</h2>
        {neurons}
      </div>
    );
  }
}

interface NeuronProps extends LayerProps {
  neuronIndex: number;
}

class NeuronControls extends Component<NeuronProps> {
  constructor(props: NeuronProps) {
    super(props);
  }

  render(): JSX.Element {
    const layer = this.layer;
    return (
      <div className="neuron">
        <label>Bias</label>
        <MatrixInput mat={layer.biases} row={0} col={this.props.neuronIndex} onchange={() => this.props.onchange()}/>
        {this.renderWeights()}
      </div>
    );
  }

  private renderWeights(): JSX.Element[] {
    const weights: JSX.Element[] = [];
    const layer = this.layer;
    for (let i = 0; i < layer.inputs; i++) {
      weights.push(
        <>
          <label>W{i}</label>
          <MatrixInput
            mat={layer.weights}
            row={i}
            col={this.props.neuronIndex}
            onchange={() => this.props.onchange()}
          />
        </>
      );
    }
    return weights;
  }

  private get layer(): Layer {
    return this.props.network.layers[this.props.layerIndex];
  }
}

interface MatrixInputProps {
  mat: Matrix;
  row: number;
  col: number;

  onchange(): void;
}

class MatrixInput extends Component<MatrixInputProps> {
  constructor(props: MatrixInputProps) {
    super(props);
    this.onchange = this.onchange.bind(this);
  }

  render(): JSX.Element {
    const value = this.props.mat.get(this.props.row, this.props.col);
    return (
      <>
        <input type="range" min="-3" max="3" step="0.01" value={value} onChange={this.onchange}/>
        <input type="number" min="-3" max="3" step="0.01" value={value} onChange={this.onchange}/>
      </>
    );
  }

  private onchange(e: ChangeEvent<HTMLInputElement>): void {
    const value = e.target.valueAsNumber;
    this.props.mat.set(this.props.row, this.props.col, value);
    this.props.onchange();
  }
}

// pos:0...1
type FlowersGenerator = (pos: vec2) => number;

function noiseFlowersGenerator(seed = SEED, noiseScale = 1.3): FlowersGenerator {
  const noiseSeed = new RNG(seed).random(0, 2 ^ 32);
  const noise = simplexNoise2D(noiseSeed);
  const pos = vec2.create();
  return p => {
    vec2.scale(pos, p, noiseScale);
    return noise(pos) >= 0 ? 1 : 0;
  }
}

// @ts-ignore
function linearFlowersGenerator(a = 1, b = 0): FlowersGenerator {
  return p => {
    const y = a * p[0] + b;
    return p[1] <= y ? 0 : 1;
  };
}

class FlowersInputs {
  static create(dim: vec2, generator: FlowersGenerator = noiseFlowersGenerator()): FlowersInputs {
    const count = dim[0] * dim[1];
    const samples = newMatrix(count, 2);
    const targets = newMatrix(count, 1);

    const size: vec2 = [1 / dim[0], 1 / dim[1]];
    const halfSize = vec2.scale(vec2.create(), size, 0.5);
    const pos = vec2.create();
    let sample = 0;
    for (let y = 0; y < dim[1]; y++) {
      for (let x = 0; x < dim[0]; x++) {
        vec2.add(pos, vec2.mul(pos, vec2.set(pos, x, y), size), halfSize);
        samples.setRow(sample, pos);

        vec2.div(pos, vec2.set(pos, x, y), dim);
        targets.set(sample, 0, generator(pos));
        sample++;
      }
    }
    return new FlowersInputs(samples, targets, dim);
  }

  outputs?: Matrix;
  readonly samples = new FlowerSamples(this);

  private constructor(readonly flowers: Matrix, readonly targets: Matrix, readonly dim: vec2) {
  }

  get count(): number {
    return this.flowers.rows;
  }

  get accuracy(): number {
    return this.samples.accuracy;
  }

  pick(count: number, seed?: string): void {
    this.samples.pick(count, seed);
  }

  predict(rnn: RNN): void {
    this.outputs = rnn.eval(this.flowers);
  }

  train(rnn: RNN, learningRate = 0.1): void {
    rnn.train(this.samples.inputs, this.samples.targets, learningRate);
  }

}


class FlowerSamples {
  indices: number[] = [];
  readonly inputs: Matrix = newMatrix(0, 2);
  readonly targets: Matrix = newMatrix(0, 2);

  constructor(readonly flowers: FlowersInputs) {
  }

  get count(): number {
    return this.indices.length;
  }

  pick(count: number, seed?: string): void {
    const pickeds = new Array(count);
    const rng = new RNG(seed);
    const remanings = [count / 2, count / 2 - (count % 2)];
    let target = -1;
    this.indices = [];
    for (let c = 0; c < count; c++) {
      let index = -1;
      let retry = 0;
      while (retry < 5) {
        index = rng.random(0, this.flowers.count);
        if (pickeds[index] === undefined) {
          target = this.flowers.targets.get(index, 0);
          if (remanings[target]) break;
        }
        index = -1;
        retry++;
      }

      if (index >= 0) {
        pickeds[index] = 1;
        remanings[target]--;
        this.indices.push(index);
      }
    }

    const samplesCount = this.indices.length;
    const samples = this.inputs.reshape(samplesCount, 2);
    const targets = this.targets.reshape(samplesCount, 2);
    for (let sample = 0; sample < samplesCount; sample++) {
      const sampleIndex = this.indices[sample];
      samples.set(sample, 0, this.flowers.flowers.get(sampleIndex, 0));
      samples.set(sample, 1, this.flowers.flowers.get(sampleIndex, 1));

      const target = this.flowers.targets.get(sampleIndex, 0);
      targets.set(sample, 0, target === 0 ? 1 : 0);
      targets.set(sample, 1, target === 1 ? 1 : 0);
    }
  }

  get accuracy(): number {
    if (!this.flowers.outputs) return 0;
    let matched = 0;
    for (let sample = 0; sample < this.indices.length; sample++) {
      const sampleIndex = this.indices[sample];
      const pred = this.flowers.outputs.maxIndex(sampleIndex);
      const target = this.targets.maxIndex(sample);
      if (pred === target)
        matched++;
    }
    return matched / this.count;
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
      const offset = pixelOffset(pos, dim);
      array[offset] = target;
      if (outputs && index < outputs.rows) {
        array[offset + 1] = outputs.maxIndex(index);
      }
    }

    const sampleIndices = inputs.samples.indices;
    for (let index = 0; index < sampleIndices.length; index++) {
      const sampleIndex = sampleIndices[index];
      flowers.getRow(sampleIndex, pos);
      const offset = pixelOffset(pos, dim);
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

  delete(): void {
    this.texture.delete();
    super.delete();
  }
}

function pixelOffset(pos: vec2, dim: vec2): number {
  vec2.floor(pos, vec2.mul(pos, pos, dim));
  return pos[1] * dim[0] * PIXEL_SIZE + pos[0] * PIXEL_SIZE;
}

export function flowers(): SandboxFactory<FlowerParameters> {
  return FlowersSandbox.create;
}

const PIXEL_SIZE = 4;
