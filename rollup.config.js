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
        return fs.readFileSync(source, { encoding: 'utf-8' }).replace('\r\n', '\n');
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

export default [
  {
    input: ['./src/index.tsx'],
    output: {
      dir: 'dist',
      format: 'esm',
      sourcemap: true,
      plugins: [terser()]
    },
    manualChunks(id) {
      if (id.includes('node_modules') || id.includes('react-esm')) {
        return 'vendor';
      }
    },
    plugins: [
      commonjs(),
      nodeResolve(),
      replace({
        'process.env.NODE_ENV': env
      }),
      glsl(),
      eslint({ ignore: false, exclude: ['react-esm/**'] }),
      typescript(),
      tstreeshaking()
    ]
  }
];