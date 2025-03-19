import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main.ts'],
  outDir: 'build',
  format: ['cjs', 'esm'],
  clean: true,
  minify: true,
})
