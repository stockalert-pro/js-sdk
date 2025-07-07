import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disable DTS due to type issues
  sourcemap: true,
  clean: true,
  minify: false,
});
