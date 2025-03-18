import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main.ts'], // Apenas o entry principal
  outDir: 'build',
  format: ['cjs', 'esm'],
  splitting: true,
  clean: true,
  dts: true,
  minify: true,
})
