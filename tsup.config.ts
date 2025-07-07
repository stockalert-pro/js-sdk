import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  splitting: false,
  target: 'es2020',
  external: ['crypto'],
  noExternal: [],
  platform: 'neutral',
  shims: true,
  esbuildOptions(options) {
    options.drop = ['console', 'debugger'];
    options.keepNames = true;
  },
});