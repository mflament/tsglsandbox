export type Cost = (actual: number, target: number) => number;

// https://stats.stackexchange.com/questions/154879/a-list-of-cost-functions-used-in-neural-networks-alongside-applications
export interface Costs {
  quadratic: Cost;
}

export const costs: Costs = {
  // cost : 0.5 * sum((pred - target)²)
  quadratic: (actual, target) => actual - target
};
