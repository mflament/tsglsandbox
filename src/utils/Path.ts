export class Path {
  static dirname(path: string): string {
    if (path === '/') return '/';
    const i = path.lastIndexOf('/');
    if (i < 0) return '/';
    return path.substring(0, i);
  }

  static joins(...paths: string[]): string {
    return paths.reduce((prev, curr) => Path.joinParts(prev, curr), '');
  }

  /**
   * ('/') : '/'
   * ('..') : ''
   * ('abc', 'file.txt') : 'abc/file.txt'
   * ('abc/../def') : 'def'
   * ('abc/../..') : ''
   * ('/abc', '../file.txt') : '/file.txt'
   * ('abc', '../file.txt') : 'file.txt'
   * ('abc', '../../file.txt') : 'file.txt'
   * ('/abc', '../../file.txt') : '/file.txt'
   *
   * @param paths
   */
  static resolve(...paths: string[]): string {
    let path = this.joins(...paths);
    path = path.replace(/\/+/, '/');
    const parts = path.split(/\//);
    const fparts: string[] = [];
    parts.forEach(part => {
      if (part === '..') {
        if (fparts.length > 0) fparts.splice(fparts.length-1, 1);
      } else if (part !== '.' && part !== '') {
        fparts.push(part);
      }
    });
    let res = this.joins(...fparts);
    if (path.startsWith('/'))
      res = '/' + res;
    return res;
  }

  private static joinParts(a: string, b: string): string {
    if (a.endsWith('/') && b.startsWith('/'))
      return a + b.substring(1);
    if (a.endsWith('/') || b.startsWith('/'))
      return a + b;
    if (a === '' || b === '') return a + b;
    return a + '/' + b;
  }

}
