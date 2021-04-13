export interface ParsedHash {
  path: string;
  params: { [key: string]: string };
}

export function hashPath(): string {
  const hash = window.location.hash;
  if (hash.length < 1) return '';
  let index = hash.indexOf('?');
  if (index < 0) index = hash.length;
  return hash.substring(1, index);
}

export function getHashParams(params: any): void {
  const hash = window.location.hash;
  let index = hash.indexOf('?');
  if (index < 0) return;

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
    if (params.hasOwnProperty(key)) params[key] = parseValue(value, params[key]);
    index = index2 + 1;
  }
}

export function updateHashParameters(path: string, params: any): void {
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
