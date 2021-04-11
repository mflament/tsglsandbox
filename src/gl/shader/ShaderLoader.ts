export class ShaderLoader {
  private readonly cache: { [file: string]: string } = {};

  constructor() {}

  async loadShader(path: string): Promise<string> {
    path = path.trim();
    if (!this.cache[path]) {
      let loader: (path: string) => Promise<string>;
      if (path.startsWith('#')) {
        path = path.substring(1);
        loader = getElementContent;
      } else {
        loader = getHTTP;
      }
      this.cache[path] = await loader(path);
    }
    return this.cache[path];
  }
}

async function getElementContent(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element?.textContent) throw new Error('Shader source element ' + elementId + ' not found');
  return element.textContent.trimStart();
}

function getHTTP(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', path);
    request.responseType = 'text';
    request.onload = () => {
      if (request.status === 200) resolve(request.responseText);
      else reject(request.status);
    };
    request.onerror = e => reject(e);
    request.send();
  });
}
