export interface ShaderLoader {
  load(path: string): Promise<string>;
}

class HttpShaderLoader implements ShaderLoader {
  load(shaderPath: string): Promise<string> {
    return fetch(shaderPath).then(response => response.text());
  }
}

type ShadersMap = { [path: string]: string };

class JSONShaderLoader implements ShaderLoader {
  private _jsonPromise?: Promise<ShadersMap>;

  constructor(readonly jsonPath: string) {}

  async load(shaderPath: string): Promise<string> {
    if (!this._jsonPromise) {
      this._jsonPromise = fetch(this.jsonPath).then(async response => {
        if (response.status === 200) {
          const json = await response.text();
          return JSON.parse(json) as ShadersMap;
        }
        throw new Error(
          'Error loding JSON shaders ' + this.jsonPath + ' ' + response.status + ' ' + response.statusText
        );
      });
    }
    return this._jsonPromise.then(shaders => {
      const shader = shaders[shaderPath];
      if (!shader) throw new Error('Shader ' + shaderPath + ' not found');
      return shader;
    });
  }
}

function isDev() {
  return window.location.host.startsWith('localhost');
}

export function createShaderLoader(): ShaderLoader {
  if (isDev()) {
    return new HttpShaderLoader();
  } else {
    return new JSONShaderLoader('shaders/shaders.json');
  }
}
