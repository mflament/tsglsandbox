
export type CancellablePromise<T = any> = Promise<T | 'cancelled'>;

export interface CancellableJob<T = any> {
  promise: CancellablePromise<T>;
  cancel(): void;
}

function startJob<T = any>(generator: Generator<unknown, T>): CancellableJob<T> {
  let stopRequested = false;
  const promise: CancellablePromise<T> = new Promise((resolve, reject) => {
    function next(): void {
      if (stopRequested) resolve('cancelled');
      else {
        try {
          const n = generator.next();
          if (n.done) resolve(n.value);
          else setTimeout(next, 0);
        } catch (e) {
          reject(e);
        }
      }
    }
    next();
  });

  return {
    promise: promise,
    cancel: () => stopRequested = true
  };
}

export class JobRunner<T> {
  private _runningJob?: CancellableJob<T>;

  async startJob(generator: Generator<unknown, T>): CancellablePromise<T> {
    if (this._runningJob) {
      this._runningJob.cancel();
      await this._runningJob.promise;
      this._runningJob = undefined;
    }
    this._runningJob = startJob(generator)
    return this._runningJob.promise.finally(() => this._runningJob = undefined);
  }
}

