import {LOGGER} from '../utils/Logger';

export interface Bindable {
  bind(): Bindable;
  unbind(): Bindable;
}

export interface Deletable {
  delete(): void;
}

const DEBUG_DELETABLE = false;
export abstract class AbstractDeletable implements Deletable {
  private static nextInstanceId = 0;
  protected readonly instanceId: number;

  constructor() {
    this.instanceId = AbstractDeletable.nextInstanceId++;
    DEBUG_DELETABLE && LOGGER.debug('Creating ' + this);
  }

  delete(): void {
    DEBUG_DELETABLE && LOGGER.debug('Deleted ' + this);
  }

  toString(): string {
    const proto = Object.getPrototypeOf(this);
    return proto.constructor.name + '[' + this.instanceId + ']';
  }
}

export function isDeletable(o: unknown): o is Deletable {
  return typeof o === 'object' && typeof (o as Deletable).delete === 'function';
}

export function checkNull<T>(creator: () => T | null): T {
  const res = creator();
  if (res == null) throw Error('Error creating object');
  return res;
}

/**
 * @param s color formated as #rrggbbaa
 */
export function parseColor(s: string, normalize = true): { r: number; g: number; b: number; a: number } {
  let r = parseInt(s.substring(1, 3), 16);
  let g = parseInt(s.substring(3, 5), 16);
  let b = parseInt(s.substring(5, 7), 16);
  let a = 255;
  if (s.length > 7) a = parseInt(s.substring(7, 9), 16);
  if (normalize) {
    r /= 255;
    g /= 255;
    b /= 255;
    a /= 255;
  }
  return { r: r, g: g, b: b, a: a };
}

export function safeDelete(deletable?: Deletable | null): void {
  if (deletable) deletable.delete;
}

export function nextPowerOfTwo(n: number): number {
  if (n === 0) return 1;
  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  return n + 1;
}

export { LOGGER } from 'utils';
