import { defineConfig } from "vitest/config"

export default defineConfig({
	esbuild: {
		jsx: "automatic",
		jsxImportSource: "react",
	},
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
