import { eslint } from 'rollup-plugin-eslint';

import typescript from 'rollup-plugin-typescript2';
import tstreeshaking from 'rollup-plugin-ts-treeshaking';

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

import replace from '@rollup/plugin-replace';

import { terser } from "rollup-plugin-terser";

const env = "production";

export default [{
  input: './src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
    plugins: [terser()]
  },
  manualChunks(id) {
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
    eslint({ ignore: false }),
    typescript({ typescript: require("typescript"), clean: true }),
    tstreeshaking()
  ]
}
];