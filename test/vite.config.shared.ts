import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		setupFiles: "./test/setup-test.ts",
		globals: true,
		sequence: {
			concurrent: false,
		},
	},
})
