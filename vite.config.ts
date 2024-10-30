import { defineConfig } from 'vite'
import tsconfigPaths from 'vitest-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
})
