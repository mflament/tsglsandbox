export interface Cancellable {
  cancel(): boolean;
}

export interface CancellablePromise<T = never> extends PromiseLike<T>, Cancellable {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: 'cancelled' | any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): CancellablePromise<TResult1 | TResult2>;
}

const OVERTIME_WARN_THRESHOLD = 0.1; // warn if run time exceed 10% of max duration

export type StoppableRunner<T = never, S = void> = Generator<S, T, () => boolean>;

export class DefaultCancellablePromise<T, S> implements CancellablePromise<T> {
  private readonly _promise: PromiseLike<T>;

  private _cancelled = false;
  private _complete = false;

  constructor(readonly runner: StoppableRunner<T, S>, readonly maxRunDuration = 100, readonly checkEveryNth = 1000) {
    this._promise = new Promise((resolve, reject) => this.run(resolve, reject, 0));
  }

  private run(resolve: (result: T) => void, reject: (reason: 'cancelled' | any) => void, iteration: number): void {
    if (this.cancelled) {
      reject('cancelled');
      return;
    }

    const startTime = performance.now();
    const timeout = startTime + this.maxRunDuration;
    let nextCheck = this.checkEveryNth;
    const shouldStop = () => {
      if (nextCheck-- === 0) {
        nextCheck = this.checkEveryNth;
        return performance.now() >= timeout;
      }
      return false;
    };

    let res;
    try {
      res = this.runner.next(shouldStop);
    } catch (e) {
      this._complete = true;
      reject(e);
      return;
    }

    const now = performance.now();
    const overTime = Math.max(0, now - timeout);
    if (overTime / this.maxRunDuration > OVERTIME_WARN_THRESHOLD) {
      const duration = now - startTime;
      console.error(
        'runner run time ' + duration + ' exceed max run duration ' + this.maxRunDuration + ' by ' + overTime + ' ms'
      );
    }

    if (res.done) {
      this._complete = true;
      console.debug('Job completed in ' + iteration + ' iterations');
      resolve(res.value);
    } else {
      setTimeout(() => this.run(resolve, reject, iteration + 1));
    }
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => PromiseLike<TResult1> | TResult1) | undefined | null,
    onrejected?: ((reason: any) => PromiseLike<TResult2> | TResult2) | undefined | null
  ): CancellablePromise<TResult1 | TResult2> {
    const delegate = this._promise.then(onfulfilled, onrejected);
    return new NestedCancellablePromise(this, delegate);
  }

  cancel(): boolean {
    if (this.done) return false;
    this._cancelled = true;
    return true;
  }

  protected get cancelled(): boolean {
    return this._cancelled;
  }

  protected get done(): boolean {
    return this._cancelled || this._complete;
  }
}

class NestedCancellablePromise<T> implements CancellablePromise<T> {
  constructor(private readonly cancellable: Cancellable, private readonly delegate: PromiseLike<T>) {}

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => PromiseLike<TResult1> | TResult1) | undefined | null,
    onrejected?: ((reason: any) => PromiseLike<TResult2> | TResult2) | undefined | null
  ): CancellablePromise<TResult1 | TResult2> {
    const newPromise = this.delegate.then(onfulfilled, onrejected);
    return new NestedCancellablePromise(this.cancellable, newPromise);
  }

  cancel(): boolean {
    return this.cancellable.cancel();
  }
}
