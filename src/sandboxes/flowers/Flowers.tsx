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
import React, { ChangeEvent, Component } from 'react';
import { vec2 } from 'gl-matrix';
import { Matrix, RNN } from 'rnn';
import { RNG, simplexNoise2D } from 'random';
import { AbstractDeletable } from '../../gl/GLUtils';
import { RefObject } from 'react';
import { Layer } from '../../rnn/RNN';

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

  private rnn: RNN;
  private mode: Mode = Mode.PREDS;
  private dirty = true;
  private accuracy = 0;

  constructor(container: SandboxContainer, name: string, readonly renderProgram: QuadProgram<RenderUniforms>) {
    super(container, name, new FlowerParameters());
    this.inputs = FlowersInputs.create(DIM, SEED);
    this.flowersTexture = new FlowersTexture(this.gl, 0);

    this.quad = newQuadDrawable(this.gl).bind();
    renderProgram.use();
    this.gl.uniform1i(renderProgram.uniformLocations.u_flowers, 0);
    this.gl.uniform1i(renderProgram.uniformLocations.u_textures, 1);
    this.gl.uniform1i(this.renderProgram.uniformLocations.u_mode, this.mode);

    this.rnn = RNN.create({ layers: [2, 2], seed: SEED });
    //this.rnn = RNN.create({ layers: [2, 3, 3, 2], seed: SEED });

    this.customControlsRef = React.createRef();

    this.pickSamples();
    this.ups = 30;
  }

  get customControls(): JSX.Element {
    return (
      <NetworkControls
        network={this.rnn}
        accuracy={this.accuracy}
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

  private pickSamples(): void {
    this.inputs.pick(this.parameters.count, SEED);
    this.flowersTexture.update(this.inputs);
  }

  private predict(): void {
    this.accuracy = this.inputs.predict(this.rnn);
    if (this.customControlsRef.current) this.customControlsRef.current.accuracy = this.accuracy;
    this.flowersTexture.update(this.inputs);
  }

  private train(): void {
    this.inputs.train(this.rnn, 0.1);
    if (this.customControlsRef.current) this.customControlsRef.current.forceUpdate();
    this.dirty = true;
  }
}

interface NeworkControlsProps {
  network: RNN;
  onchange(): void;
}

class NetworkControls extends Component<NeworkControlsProps & { accuracy: number }, { accuracy: number }> {
  constructor(props: NeworkControlsProps & { accuracy: number }) {
    super(props);
    this.state = { accuracy: props.accuracy };
  }

  render(): JSX.Element {
    const layers = this.props.network.layers.map((_layer, index) => (
      <LayerControls layerIndex={index} network={this.props.network} onchange={this.props.onchange} />
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
    this.setState({ accuracy: a });
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
        <MatrixInput mat={layer.biases} row={0} col={this.props.neuronIndex} onchange={() => this.props.onchange()} />
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

  private setWeight(input: number, w: number) {
    this.layer.weights.set(input, this.props.neuronIndex, w);
    this.props.onchange();
  }

  private get layer(): Layer {
    return this.props.network.layers[this.props.layerIndex];
  }

  private get bias(): number {
    const layer = this.layer;
    return layer.biases.get(0, this.props.neuronIndex);
  }

  private set bias(b: number) {
    const layer = this.props.network.layers[this.props.layerIndex];
    layer.biases.set(0, this.props.neuronIndex, b);
    this.props.onchange();
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
        <input type="range" min="-3" max="3" step="0.01" value={value} onChange={this.onchange} />
        <input type="number" min="-3" max="3" step="0.01" value={value} onChange={this.onchange} />
      </>
    );
  }

  private onchange(e: ChangeEvent<HTMLInputElement>): void {
    const value = e.target.valueAsNumber;
    this.props.mat.set(this.props.row, this.props.col, value);
    this.props.onchange();
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

  train(rnn: RNN, learningRate = 0.1): void {
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
