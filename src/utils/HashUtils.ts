declare global {
  interface Window {
    hashlocation: HashLocation;
  }
}

export interface HashLocation {
  path: string;
  params: { [key: string]: string };
  parseParams(target: any): void;
  update(path: string, params: any): void;
}

export function setupHashLocation(): void {
  window.hashlocation = new SimpleHashLocation();
}

class SimpleHashLocation implements HashLocation {
  get path(): string {
    const hash = window.location.hash;
    if (hash.length < 1) return '';
    let index = hash.indexOf('?');
    if (index < 0) index = hash.length;
    return hash.substring(1, index);
  }

  set path(path: string) {
    this.update(path, this.params);
  }

  get params(): { [key: string]: string } {
    const hash = window.location.hash;
    let index = hash.indexOf('?');
    if (index < 0) return {};

    const res: { [key: string]: string } = {};
    index += 1;
    while (index < hash.length) {
      let index2 = hash.indexOf('=', index);
      let key, value;
      if (index2 < 0) {
        index2 = hash.indexOf('&', index);
        if (index2 < 0) index2 = hash.length;
        key = decodeURIComponent(hash.substring(index, index2));
        value = '';
      } else {
        key = decodeURIComponent(hash.substring(index, index2));
        index = index2 + 1;
        index2 = hash.indexOf('&', index);
        if (index2 < 0) index2 = hash.length;
        value = decodeURIComponent(hash.substring(index, index2));
      }
      res[key] = value;
      index = index2 + 1;
    }
    return res;
  }

  set params(params: { [key: string]: string }) {
    this.update(this.path, params);
  }

  parseParams(target: any): void {
    const params = this.params;
    for (const key of Object.keys(params)) {
      const value = params[key];
      if (Object.prototype.hasOwnProperty.call(target, key)) target[key] = parseValue(value, target[key]);
    }
  }

  update(path: string, params: any): void {
    let hash = '#/' + path;
    const keys = Object.keys(params);
    if (keys.length > 0) {
      let index = 0;
      for (const key of keys) {
        hash += index === 0 ? '?' : '&';
        const value = params[key];
        hash += key;
        if (value) hash += '=' + value;
        index++;
      }
    }
    window.location.hash = hash;
  }
}

function parseValue(s: string | undefined, defaultValue: any): string | boolean | number {
  const type = typeof defaultValue;
  if (type === 'boolean') return s !== 'false';
  if (type === 'string' && s !== undefined) return s;
  if (type === 'number' && s !== undefined) {
    const n = parseFloat(s);
    if (!isNaN(n)) return n;
  }
  return defaultValue;
}
