export interface ParsedHash {
  path: string;
  params: { [key: string]: string };
}

export function parseHash(): ParsedHash {
  const hash = window.location.hash;
  if (hash.length < 1) return { path: '', params: {} };
  let index = hash.indexOf('?');
  if (index < 0) index = hash.length;
  const path = hash.substring(1, index);
  const params: { [key: string]: string } = {};
  index += 1;
  while (index < hash.length) {
    let index2 = hash.indexOf('=', index);
    let key, value;
    if (index2 < 0) {
      index2 = hash.indexOf('&', index);
      if (index2 < 0) index2 = hash.length;
      key = decodeURIComponent(hash.substring(index, index2));
      value = undefined;
    } else {
      key = decodeURIComponent(hash.substring(index, index2));
      index = index2 + 1;
      index2 = hash.indexOf('&', index);
      if (index2 < 0) index2 = hash.length;
      value = decodeURIComponent(hash.substring(index, index2));
    }
    if (value) params[key] = value;
    index = index2 + 1;
  }
  return { path: path, params: params };
}
