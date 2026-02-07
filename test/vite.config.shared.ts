import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

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
