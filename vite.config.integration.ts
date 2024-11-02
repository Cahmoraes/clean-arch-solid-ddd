import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: './setup-test.ts',
    globals: true,
    include: ['**/*.integration-test.ts'],
  },
})
