/**
 * @param {string} seed A string to seed the generator.
 */
class RC4 {
  private readonly s: number[];
  private i: number;
  private j: number;

  constructor(readonly seed: string) {
    this.s = new Array(256);
    this.i = 0;
    this.j = 0;
    for (let i = 0; i < 256; i++) {
      this.s[i] = i;
    }
    this.mix(seed);
  }

  static getStringBytes(string: string): number[] {
    let output: number[] = [];
    for (let i = 0; i < string.length; i++) {
      let c = string.charCodeAt(i);
      const bytes = [];
      do {
        bytes.push(c & 0xff);
        c = c >> 8;
      } while (c > 0);
      output = output.concat(bytes.reverse());
    }
    return output;
  }

  private swap(i: number, j: number): void {
    const tmp = this.s[i];
    this.s[i] = this.s[j];
    this.s[j] = tmp;
  }

  /**
   * Mix additional entropy into this generator.
   */
  private mix(seed: string): void {
    const input = RC4.getStringBytes(seed);
    let j = 0;
    for (let i = 0; i < this.s.length; i++) {
      j += this.s[i] + input[i % input.length];
      j %= 256;
      this.swap(i, j);
    }
  }

  /**
   * @returns {number} The next byte of output from the generator.
   */
  next(): number {
    this.i = (this.i + 1) % 256;
    this.j = (this.j + this.s[this.i]) % 256;
    this.swap(this.i, this.j);
    return this.s[(this.s[this.i] + this.s[this.j]) % 256];
  }
}

const RANDOM_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomSeed(length: number, random?: () => number): string {
  if (!random) random = () => Math.random();
  const codes: string[] = new Array(length);
  for (let index = 0; index < length; index++) {
    codes[index] = RANDOM_CHARS.charAt(random() * RANDOM_CHARS.length);
  }
  return codes.join('');
}

/**
 * Create a new random number generator with optional seed. If the
 * provided seed is a function (i.e. Math.random) it will be used as
 * the uniform number generator.
 * @param seed An arbitrary object used to seed the generator.
 * @constructor
 */
export class RNG {
  readonly seed: string;
  private _state: RC4;
  private _normal?: number;

  static randomSeed(length = 8): string {
    return randomSeed(length, () => Math.random());
  }

  constructor(seed?: string) {
    this.seed = seed || RNG.randomSeed();
    this._state = new RC4(this.seed);
  }

  /**
   * @returns {number} Uniform random number between 0 and 255.
   */
  nextByte(): number {
    return this._state.next();
  }

  /**
   * @returns {number} Uniform random number between 0 and 1.
   */
  uniform(): number {
    const BYTES = 7; // 56 bits to make a 53-bit double
    let output = 0;
    for (let i = 0; i < BYTES; i++) {
      output *= 256;
      output += this.nextByte();
    }
    return output / (Math.pow(2, BYTES * 8) - 1);
  }

  /**
   * Produce a random integer within [n, m).
   * @param {number} [n=0]
   * @param {number} m
   *
   */
  random(n?: number, m?: number): number {
    if (n === undefined) {
      return this.uniform();
    } else if (m === undefined) {
      m = n;
      n = 0;
    }
    return n + Math.floor(this.uniform() * (m - n));
  }

  /**
   * Generates numbers using this.uniform() with the Box-Muller transform.
   * @returns {number} Normally-distributed random number of mean 0, variance 1.
   */
  normal(): number {
    if (this._normal !== undefined) {
      const n = this._normal;
      this._normal = undefined;
      return n;
    } else {
      const x = this.uniform() || Math.pow(2, -53); // can't be exactly 0
      const y = this.uniform();
      this._normal = Math.sqrt(-2 * Math.log(x)) * Math.sin(2 * Math.PI * y);
      return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y);
    }
  }

  /**
   * Generates numbers using this.uniform().
   * @returns {number} Number from the exponential distribution, lambda = 1.
   */
  exponential(): number {
    return -Math.log(this.uniform() || Math.pow(2, -53));
  }

  /**
   * Generates numbers using this.uniform() and Knuth's method.
   * @param {number} [mean=1]
   * @returns {number} Number from the Poisson distribution.
   */
  poisson(mean: number): number {
    const L = Math.exp(-(mean || 1));
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.uniform();
    } while (p > L);
    return k - 1;
  }

  /**
   * Generates numbers using this.uniform(), this.normal(),
   * this.exponential(), and the Marsaglia-Tsang method.
   * @param {number} a
   * @returns {number} Number from the gamma distribution.
   */
  gammafunction(a: number): number {
    const d = (a < 1 ? 1 + a : a) - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    let u: number, x2: number, x: number, v: number;
    do {
      do {
        x = this.normal();
        v = Math.pow(c * x + 1, 3);
      } while (v <= 0);
      u = this.uniform();
      x2 = Math.pow(x, 2);
    } while (u >= 1 - 0.0331 * x2 * x2 && Math.log(u) >= 0.5 * x2 + d * (1 - v + Math.log(v)));

    if (a < 1) {
      return d * v * Math.exp(this.exponential() / -a);
    } else {
      return d * v;
    }
  }

  randomString(length: number): string {
    return randomSeed(length, () => this.uniform());
  }

  /**
   * Accepts a dice rolling notation string and returns a generator
   * function for that distribution. The parser is quite flexible.
   * @param {string} expr A dice-rolling, expression i.e. '2d6+10'.
   * @returns {Function}
   */
  roller(expr: string): () => number {
    const parts = expr.split(/(\d+)?d(\d+)([+-]\d+)?/).slice(1);
    const dice = parseFloat(parts[0]) || 1;
    const sides = parseFloat(parts[1]);
    const mod = parseFloat(parts[2]) || 0;
    return (): number => {
      let total = dice + mod;
      for (let i = 0; i < dice; i++) {
        total += this.random(sides);
      }
      return total;
    };
  }
}
