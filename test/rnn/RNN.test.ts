import {activations} from '../../src/rnn/Activation';
import {DefaultRNN, newMatrix} from '../../src/rnn/RNN';

test('create RNN from layers sizes', () => {
  const rnn = DefaultRNN.create({layers: [2, 4, 3]});
  expect(rnn.inputs).toBe(2);
  expect(rnn.outputs).toBe(3);

  expect(rnn.layers.length).toBe(2);

  let lc = rnn.layers[0];
  expect(lc.inputs).toBe(2);
  expect(lc.outputs).toBe(4);

  lc = rnn.layers[1];
  expect(lc.inputs).toBe(4);
  expect(lc.outputs).toBe(3);
});

test('[2, 2] eval', () => {
  const rnn = DefaultRNN.create({
    layers: [
      {
        weights: [
          [0.3, 0.2],
          [0.5, 0.7]
        ],
        biases: [[0.4, 0.6]]
      }
    ]
  });
  expect(rnn.inputs).toBe(2);
  expect(rnn.outputs).toBe(2);
  expect(rnn.layers.length).toBe(1);

  const samples = newMatrix([
    [-0.3, 0.25],
    [0.4, 0.18]
  ]);
  const preds = rnn.eval(samples);
  expect(preds.rows).toBe(2);
  expect(preds.columns).toBe(2);

  expect(preds.get(0, 0)).toBeCloseTo(sigmoid(-0.3 * 0.3 + 0.25 * 0.5 + 0.4));
  expect(preds.get(0, 1)).toBeCloseTo(sigmoid(-0.3 * 0.2 + 0.25 * 0.7 + 0.6));

  expect(preds.get(1, 0)).toBeCloseTo(sigmoid(0.4 * 0.3 + 0.18 * 0.5 + 0.4));
  expect(preds.get(1, 1)).toBeCloseTo(sigmoid(0.4 * 0.2 + 0.18 * 0.7 + 0.6));
});

test('[2, 2, 2] config', () => {
  const rnn = new222();
  let layer =rnn.layers[0];
  expect(layer.weights.get(0,0)).toBeCloseTo(0.15); //w1
  expect(layer.weights.get(0,1)).toBeCloseTo(0.25); //w3
  expect(layer.weights.get(1,0)).toBeCloseTo(0.2); //w2
  expect(layer.weights.get(1,1)).toBeCloseTo(0.30); //w4
  layer = rnn.layers[1];
  expect(layer.weights.get(0,0)).toBeCloseTo(0.40); //w5
  expect(layer.weights.get(0,1)).toBeCloseTo(0.5); //w7
  expect(layer.weights.get(1,0)).toBeCloseTo(0.45); //w6
  expect(layer.weights.get(1,1)).toBeCloseTo(0.55); //w8
});


test('[2, 2, 2] eval', () => {
  const rnn = new222();

  const samples = newMatrix([[0.05, 0.1]]);

  rnn.eval(samples);

  let layer = rnn.layers[0];
  const neth1 = 0.15 * 0.05 + 0.2 * 0.1 + 0.35;
  expect(layer.z.get(0, 0)).toBeCloseTo(neth1);
  expect(layer.z.get(0, 0)).toBeCloseTo(0.3775);
  expect(layer.a.get(0, 0)).toBeCloseTo(0.593269992);
  const oh1 = sigmoid(neth1);
  expect(layer.a.get(0, 0)).toBeCloseTo(oh1);

  const oh2 = 0.596884378;
  expect(layer.a.get(0, 1)).toBeCloseTo(oh2);

  layer = rnn.layers[1];
  const neto1 = 0.4  * oh1 + 0.45 * oh2 + 0.6;
  expect(neto1).toBeCloseTo(1.105905967);
  expect(layer.z.get(0, 0)).toBeCloseTo(neto1);

  const oo1 = sigmoid(neto1);
  expect(oo1).toBeCloseTo(0.75136507);
  expect(layer.a.get(0, 0)).toBeCloseTo(oo1);

  const oo2 = 0.772928465;
  expect(layer.a.get(0, 1)).toBeCloseTo(oo2);
});

test('[2, 2, 2] train', () => {
  const rnn = new222();
  const samples = newMatrix([[0.05, 0.1]]);
  const targets = newMatrix([[0.01, 0.99]]);

  rnn.eval(samples);
  let layer = rnn.layers[1];
  const neto1 = layer.z.get(0, 0);
  const neto2 = layer.z.get(0, 1);
  const oo1 = layer.a.get(0, 0);
  const oo2 = layer.a.get(0, 1);

  const dcost1 = oo1 - targets.get(0, 0);
  const dcost2 = oo2 - targets.get(0, 1);
  expect(dcost1).toBeCloseTo(0.74136507); //w5
  expect(dsigmoid(neto1)).toBeCloseTo(0.186815602);

  rnn.train(samples, targets, 0.5);

  expect(layer.a.get(0, 0)).toBeCloseTo(dcost1 * dsigmoid(neto1));
  expect(layer.a.get(0, 0)).toBeCloseTo(0.138498562);
  expect(layer.a.get(0, 1)).toBeCloseTo(dcost2 * dsigmoid(neto2));

  expect(layer.bgrads.get(0, 0)).toBeCloseTo(dcost1 * dsigmoid(neto1));
  expect(layer.bgrads.get(0, 1)).toBeCloseTo(dcost2 * dsigmoid(neto2));

  expect(layer.wgrads.get(0, 0)).toBeCloseTo(0.082167041); // dw5

  expect(layer.weights.get(0, 0)).toBeCloseTo(0.35891648); //w5+
  expect(layer.weights.get(1, 0)).toBeCloseTo(0.408666186); //w6+

  expect(layer.weights.get(0, 1)).toBeCloseTo(0.51130127); //w7+
  expect(layer.weights.get(1, 1)).toBeCloseTo(0.561370121); //w8+

  layer = rnn.layers[0];

  expect(layer.wgrads.get(0, 0)).toBeCloseTo(0.000438568); // dw1

  // const weights = layer.weights.transpose();
  const weights = layer.weights;
  expect(weights.get(0, 0)).toBeCloseTo(0.149780716); // w1+
  expect(weights.get(1, 0)).toBeCloseTo(0.19956143); // w2+

  expect(weights.get(0, 1)).toBeCloseTo(0.24975114); // w3+
  expect(weights.get(1, 1)).toBeCloseTo(0.29950229); // w4+
});

function sigmoid(x: number): number {
  return activations.sigmoid.forward(x);
}

function dsigmoid(x: number): number {
  return activations.sigmoid.backward(x);
}

function new222(): DefaultRNN {
  return DefaultRNN.create({
    layers: [
      {
        weights: [
          [0.15, 0.25], // w1, w3
          [0.2, 0.3] // w2, w4
        ],
        biases: [[0.35, 0.35]]
      },
      {
        weights: [
          [0.4, 0.5], // w5, w7
          [0.45, 0.55] // w6, w8
        ],
        biases: [[0.6, 0.6]]
      }
    ]
  });
}
