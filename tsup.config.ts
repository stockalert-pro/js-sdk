import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  // Generate type declarations alongside JavaScript output
  dts: {
    resolve: true,
    // Do NOT set `only: true` or the build will emit only .d.ts without JS
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
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      // Remove .d.cts file as we only need .d.ts
      await fs.unlink(path.join(__dirname, 'dist/index.d.cts')).catch(() => {});
      // Remove any sourcemap files if they exist
      const files = await fs.readdir(path.join(__dirname, 'dist')).catch(() => [] as string[]);
      for (const file of files) {
        if (file.endsWith('.map')) {
          await fs.unlink(path.join(__dirname, 'dist', file)).catch(() => {});
        }
      }
    } catch {
      // Ignore any cleanup errors
    }
  },
});
