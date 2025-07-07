import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    only: true,
  },
  sourcemap: false,
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
    options.keepNames = false;
    options.legalComments = 'none';
    options.charset = 'utf8';
  },
  onSuccess: async () => {
    // Clean up unnecessary files after build
    const fs = require('fs').promises;
    const path = require('path');
    try {
      // Remove .d.cts file as we only need .d.ts
      await fs.unlink(path.join(__dirname, 'dist/index.d.cts'));
      // Remove any sourcemap files if they exist
      const files = await fs.readdir(path.join(__dirname, 'dist'));
      for (const file of files) {
        if (file.endsWith('.map')) {
          await fs.unlink(path.join(__dirname, 'dist', file));
        }
      }
    } catch (e) {
      // Ignore errors
    }
  },
});