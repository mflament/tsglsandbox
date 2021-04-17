import { eslint } from 'rollup-plugin-eslint';

import typescript from 'rollup-plugin-typescript2';
import tstreeshaking from 'rollup-plugin-ts-treeshaking';

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

import replace from '@rollup/plugin-replace';

import { terser } from 'rollup-plugin-terser';
import { dataToEsm } from 'rollup-pluginutils';
import fs from 'fs';

const env = "production";

function glsl() {
  function filter(name) {
    return name.match(/.*\.glsl/)
  }

  return {
    name: 'bundle-shader',
    resolveId(source) {
      if (filter(source)) return source;
      return null;
    },
    load(source) {
      if (filter(source)) {
        return fs.readFileSync(source, { encoding: 'utf-8' });
      }
      return null;
    },
    transform(code, id) {
      if (filter(id)) {
        return dataToEsm(code);
      }
    }
  };
}

export default [{
  input: './src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
    plugins: [terser()]
  },
  manualChunks: id => {
    if (id.includes('node_modules')) {
      return 'vendor';
    }
  },
  plugins: [
    nodeResolve(),
    replace({
      'process.env.NODE_ENV': JSON.stringify(env)
    }),
    commonjs(),
    glsl(),
    eslint({ ignore: false }),
    typescript(),
    tstreeshaking()
  ]
}
];