export interface Activation {
  forward: (x: number) => number;
  // a = forward(z)
  backward: (z: number) => number;
}

export interface Activations {
  sigmoid: Activation;
}

export const activations: Activations = {
  sigmoid: {
    forward: sigmoid,
    backward: z => sigmoid(z) * (1 - sigmoid(z))
  }
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
