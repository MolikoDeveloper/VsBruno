// rollup.config.js
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs     from '@rollup/plugin-commonjs';

/** @type {import('rollup').RollupOptions} */
export default {
  input:  'src/vendor/rollup-entry.js',
  output: {
    file:    'dist/vendor/rollup.cjs',
    format:  'cjs',
    exports: 'named',
    sourcemap: false
  },
  plugins: [
    nodeResolve(),
    commonjs({
      ignoreDynamicRequires: true,
      ignore: ['@rollup/rollup-darwin-x64']
    })
  ],
  external: ["fsevents"]
};
