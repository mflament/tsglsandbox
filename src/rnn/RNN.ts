import {RNG} from 'random';
import {Activation, Activations, activations} from './Activation';
import {Cost, Costs, costs} from './Cost';
import {Matrix} from './Matrix';

/**
 * Docs
 * https://towardsdatascience.com/back-propagation-the-easy-way-part-3-cc1de33e8397
 * https://mattmazur.com/2015/03/17/a-step-by-step-backpropagation-example/
 *
 * For each layer:
 * weights : [inputs, neurons]
 * biases : [1, neurons]
 * outputs == neurons
 */

export type LayerConfig = { weights: Matrix | number[][]; biases: Matrix | number[][] };

export const newMatrix = Matrix.float32Factory;

export interface RNNConfig {
  readonly layers: number[] | LayerConfig[];
  readonly activation?: keyof Activations;
  readonly dcost?: keyof Costs;
  readonly seed?: string;
}

export interface RNN {
  readonly inputs: number;
  readonly outputs: number;
  readonly layers: Layer[];

  eval(samples: Matrix): Matrix;

  train(samples: Matrix, targets: Matrix, learningRate: number): void;
}

export interface Layer {
  readonly inputs: number;
  readonly outputs: number;
  readonly weights: Matrix;
  readonly biases: Matrix;
}

function randomizeLayers(layersSizes: number[], seed = RNG.randomSeed(5)): LayerConfig[] {
  const res: LayerConfig[] = [];
  const rng = new RNG(seed);
  let layerInputs = layersSizes[0];
  for (let index = 1; index < layersSizes.length; index++) {
    const layerOutputs = layersSizes[index];
    const weights = newMatrix(layerInputs, layerOutputs);
    weights.fill(() => rng.uniform() * 6 - 3);
    const biases = newMatrix(1, layerOutputs);
    res.push({weights: weights, biases: biases});
    layerInputs = layerOutputs;
  }
  return res;
}

function createMatrix(config: Matrix | number[][]): Matrix {
  if (config instanceof Matrix) return config;
  return newMatrix(config);
}

export class DefaultRNN implements RNN {
  static create(config: RNNConfig): DefaultRNN {
    const activation = activations[config.activation || 'sigmoid'] || activations.sigmoid;
    const dcost = costs[config.dcost || 'quadratic'] || costs.quadratic;
    const rnn = new DefaultRNN(activation, dcost);
    let layerConfigs: LayerConfig[];
    if (isLayerConfigArray(config.layers)) {
      layerConfigs = config.layers;
    } else {
      layerConfigs = randomizeLayers(config.layers, config.seed);
    }

    let previousLayer: Layer | undefined;
    layerConfigs.map(lc => {
      const weights = createMatrix(lc.weights);
      const biases = createMatrix(lc.biases);
      return new DefaultLayer(weights, biases, activation);
    }).forEach(layer => {
      if (previousLayer && previousLayer.outputs !== layer.inputs) {
        //previousLayer.outputs
        throw new Error(`Invalid layer config ${layer}, inputs mismatch from previous layer : ${previousLayer}`);
      }
      rnn.layers.push(layer);
      previousLayer = layer;
    });
    return rnn;
  }

  readonly layers: DefaultLayer[] = [];

  private constructor(readonly activation: Activation, readonly dcost: Cost) {
  }

  get inputs(): number {
    return this.layers[0].inputs;
  }

  get outputs(): number {
    return this.layers[this.layers.length - 1].outputs;
  }

  eval(samples: Matrix): Matrix {
    if (samples.columns < this.inputs)
      throw new Error('invalid samples size: ' + samples.columns + ', inputs is ' + this.inputs);
    return this.feedForward(samples);
  }

  train(samples: Matrix, targets: Matrix, learningRate: number): void {
    if (samples.columns < this.inputs)
      throw new Error('invalid samples size: ' + samples.columns + ', inputs is ' + this.inputs);
    if (targets.columns < this.outputs)
      throw new Error('invalid targets size: ' + targets.columns + ', ouputs is ' + this.outputs);
    if (targets.rows < samples.rows)
      throw new Error('invalid targets rows: ' + targets.rows + ', samples is ' + samples.rows);

    this.feedForward(samples);

    let layer = this.layers[this.layers.length - 1];
    // dcost
    layer.a.update((row, col, a) => this.dcost(a, targets.get(row, col)));

    for (let index = this.layers.length - 1; index > 0; index--) {
      layer = this.layers[index];
      const previous = this.layers[index - 1];
      layer.backward(previous.a);
      // activations[layer - 1] = a . T(weights[layer])
      layer.a.dot(layer.weights.transpose(tempMatrix), previous.a);
    }
    this.layers[0].backward(samples);
    const lr = learningRate / samples.rows;
    this.layers.forEach(l => l.update(lr));
  }

  static createLabels<T>(outputs: Matrix, labels: T[]): T[] {
    const res: T[] = new Array(outputs.rows);
    const maxIndices = outputs.maxIndices();
    for (let output = 0; output < maxIndices.rows; output++) {
      res[output] = labels[maxIndices.get(output, 0)];
    }
    return res;
  }

  static createOutputs(labelsCount: number, labelIndices: number[]): Matrix {
    const m = newMatrix(labelIndices.length, labelsCount);
    for (let index = 0; index < labelIndices.length; index++) {
      m.set(index, labelIndices[index], 1);
    }
    return m;
  }

  private feedForward(samples: Matrix): Matrix {
    let inputs = samples;
    this.layers.forEach(l => (inputs = l.forward(inputs)));
    return inputs;
  }
}

type Training = {
  readonly wgrads: Matrix;
  readonly bgrads: Matrix;
};

class DefaultLayer implements Layer {
  readonly z: Matrix;
  readonly a: Matrix;

  private _training?: Training;

  constructor(readonly weights: Matrix, readonly biases: Matrix, readonly activation: Activation) {
    if (weights.columns !== biases.columns)
      throw new Error(`Invalid layer config ${this}, biases and weights columns count mismatch`);
    if (biases.rows !== 1) throw new Error(`Invalid layer config ${this}, invalid biases rows count`);
    this.z = newMatrix(0, 0);
    this.a = newMatrix(0, 0);
  }

  get inputs(): number {
    return this.weights.rows;
  }

  get outputs(): number {
    return this.weights.columns;
  }

  toString(): string {
    return `{\nweights: ${this.weights}, \nbiases: ${this.biases}`;
  }

  forward(inputs: Matrix): Matrix {
    inputs.dot(this.weights, this.z);
    this.a.reshape(inputs.rows, this.outputs);
    this.z.update((r, c, z) => {
      z += this.biases.get(0, c);
      this.a.set(r, c, this.activation.forward(z));
      return z;
    });
    return this.a;
  }

  backward(inputs: Matrix): void {
    // a = a * activation_prime(z)
    this.a.update((row, col, a) => {
      const dz = this.activation.backward(this.z.get(row, col));
      return a * dz;
    })
    const training = this.training;
    // wgrad = T(inputs) . a
    inputs.transpose(tempMatrix).dot(this.a, training.wgrads);
    // bgrad = sum(activations[r])
    this.a.sumRows(training.bgrads);
  }

  update(lr: number): void {
    const training = this.training;
    this.weights.update((row, col, w) => w - lr * training.wgrads.get(row, col));
    this.biases.update((row, col, b) => b - lr * training.bgrads.get(row, col));
  }

  get wgrads(): Matrix {
    return this.training.wgrads;
  }

  get bgrads(): Matrix {
    return this.training.bgrads;
  }

  private get training(): Training {
    if (!this._training) {
      this._training = {wgrads: newMatrix(this.inputs, this.outputs), bgrads: newMatrix(1, this.outputs)};
    }
    return this._training;
  }
}

function isNumberArray(o: any): o is number[] {
  return Array.isArray(o) && o.every(e => typeof e === 'number');
}

function isNumberMatrix(o: any): o is number[][] {
  return Array.isArray(o) && o.every(e => isNumberArray(e));
}

function isMatrixConfig(o: any): o is number[][] | Matrix {
  return o instanceof Matrix || isNumberMatrix(o);
}

function isLayerConfig(o: any): o is LayerConfig {
  if (typeof o === 'object') {
    const c = o as Partial<LayerConfig>;
    return isMatrixConfig(c.weights) && isMatrixConfig(c.biases);
  }
  return false;
}

function isLayerConfigArray(o: any): o is LayerConfig[] {
  return Array.isArray(o) && o.every(e => isLayerConfig(e));
}

const tempMatrix = newMatrix(0, 0);
