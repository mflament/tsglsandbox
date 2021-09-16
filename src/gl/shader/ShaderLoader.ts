import { Path } from 'utils';

export interface ShaderLoader {
  load(path: string): Promise<string>;
}

export function createShaderLoader(): ShaderLoader {
  // @ts-ignore
  const sources = self['shaderSources'];
  if (sources && typeof sources === 'object') {
    return new StaticShaderLoader(sources);
  }
  return new HttpShaderLoader();
}

export class HttpShaderLoader implements ShaderLoader {
  load(shaderPath: string): Promise<string> {
    return fetch(shaderPath).then(response => response.text());
  }
}

class StaticShaderLoader implements ShaderLoader {
  constructor(private readonly shaders: { [path: string]: string }) {}
  load(path: string): Promise<string> {
    if (!this.shaders[path]) return Promise.reject('Shader "' + path + '" not found');
    return Promise.resolve(this.shaders[path]);
  }
}

export function shaderPath(shaderPath: string, importMeta?: ImportMeta): string {
  if (importMeta) {
    const path = Path.dirname(new URL(importMeta.url).pathname);
    return Path.resolve(path, shaderPath);
  }
  return Path.resolve('shaders', shaderPath);
}
