import { RNG } from 'random';
import { Activation, Activations, activations } from './Activation';
import { Cost, Costs, costs } from './Cost';
import { Matrix } from './Matrix';

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

export type LayerConfig = { weights: Matrix; biases: Matrix };

export const newMatrix = Matrix.float32Factory;

export interface RNNConfig {
  readonly layers: number[] | { weights: number[][]; biases: number[] }[] | LayerConfig[];
  readonly activation?: keyof Activations;
  readonly dcost?: keyof Costs;
  readonly seed?: string;
}

export class RNN {
  static create(config: RNNConfig): RNN {
    const layers: Layer[] = [];
    const activation = activations[config.activation || 'sigmoid'] || activations.sigmoid;
    const dcost = costs[config.dcost || 'quadratic'] || costs.quadratic;

    if (typeof config.layers[0] === 'number') {
      const rng = new RNG(config.seed || RNG.randomSeed(5));
      const layersSizes = config.layers as number[];
      let layerInputs = layersSizes[0];
      for (let index = 1; index < layersSizes.length; index++) {
        const layerOutputs = layersSizes[index];

        const weights = newMatrix(layerInputs, layerOutputs);
        weights.fill(() => rng.uniform() * 6 - 3);

        const biases = newMatrix(1, layerOutputs);
        layers.push(new Layer(weights, biases, activation));
        layerInputs = layerOutputs;
      }
    } else if (isArrayLayerConfig(config.layers[0])) {
      config.layers.forEach((l: unknown) => {
        if (isArrayLayerConfig(l)) {
          const weights = newMatrix(l.weights);
          const biases = newMatrix(1, l.biases.length).setRow(0, l.biases);
          layers.push(new Layer(weights, biases, activation));
        } else throw new Error('Invalid layer config ' + JSON.stringify(l));
      });
    } else {
      config.layers.forEach((l: unknown) => {
        if (isLayerConfig(l)) {
          layers.push(new Layer(l.weights, l.biases, activation));
        } else throw new Error('Invalid layer config ' + JSON.stringify(l));
      });
    }

    layers.reduce((prevLayer, layer) => {
      if (prevLayer && prevLayer.outputs !== layer.inputs)
        throw new Error(`Invalid layer config ${layer}, inputs mismatch from previous layer : ${prevLayer}`);
      return layer;
    });

    return new RNN(layers, activation, dcost);
  }

  readonly newMatrix = newMatrix;

  private constructor(readonly layers: Layer[], readonly activation: Activation, readonly dcost: Cost) {}

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

    this.feedForward(samples, true);

    let layer = this.layers[this.layers.length - 1];
    // dcost
    layer.backward(targets, this.dcost);

    for (let index = this.layers.length - 2; index >= 0; index--) {
      layer = this.layers[index];
      layer.backward(this.layers[index + 1], this.dcost);
    }

    let input = samples;
    this.layers.forEach(l => (input = l.update(input, learningRate)));
  }

  createLabels<T>(outputs: Matrix, labels: T[]): T[] {
    const res: T[] = new Array(outputs.rows);
    const maxIndices = outputs.maxIndices();
    for (let output = 0; output < maxIndices.rows; output++) {
      res[output] = labels[maxIndices.get(output, 0)];
    }
    return res;
  }

  createOutputs(labelsCount: number, labelIndices: number[]): Matrix {
    const m = newMatrix(labelIndices.length, labelsCount);
    for (let index = 0; index < labelIndices.length; index++) {
      m.set(index, labelIndices[index], 1);
    }
    return m;
  }

  private feedForward(samples: Matrix, train?: boolean): Matrix {
    let inputs = samples;
    this.layers.forEach(l => (inputs = l.forward(inputs, train)));
    return inputs;
  }
}

type Training = {
  readonly dz: Matrix;
  readonly delta: Matrix;
  readonly grads: Matrix;
};

export class Layer {
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

  forward(inputs: Matrix, train?: boolean): Matrix {
    inputs.dot(this.weights, this.z);
    this.a.reshape(inputs.rows, this.outputs);
    this.z.update((r, c, z) => {
      z += this.biases.get(0, c);
      this.a.set(r, c, this.activation.forward(z));
      return z;
    });

    if (train) {
      if (!this._training) {
        this._training = {
          dz: newMatrix(0, 0),
          delta: newMatrix(0, 0),
          grads: newMatrix(this.weights.rows, this.weights.columns)
        };
      }
      const training = this._training;
      training.dz.reshape(inputs.rows, this.outputs);
      this.z.forEach((r, c, z) => training.dz.set(r, c, this.activation.backward(z)));
    }
    return this.a;
  }

  backward(param: Layer | Matrix, dcost: Cost): void {
    const delta = this.training.delta;
    delta.reshape(this.z.rows, this.z.columns);
    if (param instanceof Matrix) {
      const targets = param;
      delta.update((r, c, v) => dcost(v, targets.get(r, c)));
    } else {
      const rightLayer = param;
      rightLayer.training.delta.dot(rightLayer.weights.transpose(tempMatrix), delta);
    }
  }

  update(input: Matrix, lr: number): Matrix {
    const training = this.training;

    input.transpose(tempMatrix).dot(training.delta, training.grads);
    this.weights.update((r, c, w) => w - lr * training.grads.get(r, c));

    // training.delta.sumRows(training.grads);
    // this.biases.update((r, c, b) => b - lr * (training.grads.get(r, c) / input.rows));
    return this.a;
  }

  private get training(): Training {
    if (!this._training) throw new Error('Training not initialized');
    return this._training;
  }
}

function isLayerConfig(o: any): o is LayerConfig {
  if (typeof o === 'object') {
    const c = o as LayerConfig;
    return c.weights instanceof Matrix && c.biases instanceof Matrix;
  }
  return false;
}

function isArrayLayerConfig(o: any): o is { weights: number[][]; biases: number[] } {
  if (typeof o === 'object') {
    const c = o as { weights: number[][]; biases: number[] };
    return (
      Array.isArray(c.weights) &&
      Array.isArray(c.weights[0]) &&
      typeof c.weights[0][0] === 'number' &&
      Array.isArray(c.biases) &&
      typeof c.biases[0] === 'number'
    );
  }
  return false;
}

const tempMatrix = newMatrix(0, 0);
