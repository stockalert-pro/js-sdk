import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    // Only emit d.ts files, no .d.cts
    only: true,
  },
  sourcemap: false, // Remove sourcemaps from npm package
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
    options.keepNames = false; // Don't keep function names in production
    options.legalComments = 'none'; // Remove all comments
    options.charset = 'utf8';
  },
});