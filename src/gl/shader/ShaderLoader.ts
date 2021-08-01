import {Path} from 'utils';

export interface ShaderLoader {
  load(path: string): Promise<string>;
}

export function createShaderLoader(): ShaderLoader {
  // @ts-ignore
  const sources = self['shaderSources'];
  if (sources && typeof sources === 'object') {
    return new StaticShaderLoader(sources);
  }
  return new HttpShaderLoader('shaders');
}

class HttpShaderLoader implements ShaderLoader {
  constructor(readonly baseUri?: string) {}

  load(shaderPath: string): Promise<string> {
    if (this.baseUri) shaderPath = Path.resolve(this.baseUri, shaderPath);
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', shaderPath);
      request.responseType = 'text';
      request.onload = () => {
        if (request.status === 200) resolve(request.response);
        reject(request);
      };
      request.onerror = () => reject(request);
      request.ontimeout = () => reject(request);
      request.send();
    });
  }
}

class StaticShaderLoader implements ShaderLoader {
  constructor(private readonly shaders: { [path: string]: string }) {}
  load(path: string): Promise<string> {
    if (!this.shaders[path]) return Promise.reject('Shader "' + path + '" not found');
    return Promise.resolve(this.shaders[path]);
  }
}
