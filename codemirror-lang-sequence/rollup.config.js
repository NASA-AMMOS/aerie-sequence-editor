import typescript from 'rollup-plugin-ts';
import { lezer } from '@lezer/generator/rollup';

export default {
  external: (id) => id != 'tslib' && !/^(\.?\/|\w:)/.test(id),
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.cjs', format: 'cjs' },
    { dir: './dist', format: 'es' },
  ],
  plugins: [lezer(), typescript()],
};
