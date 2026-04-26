import { defineConfig } from "vitest/config"

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		setupFiles: "./test/setup-test.ts",
		globals: true,
		sequence: {
			concurrent: false,
		},
	},
})
