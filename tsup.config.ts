import { defineConfig } from 'tsup';

export default defineConfig([
  // SDK build
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
  },
  // CLI build
  {
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: false,
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
