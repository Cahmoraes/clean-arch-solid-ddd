/// <reference types="vitest" />
import { createRequire } from "node:module"
import path from "node:path"
import { defineConfig } from "vitest/config"

const frontendRoot = path.resolve(__dirname, "../../../../../apps/frontend")
const frontendSrc = path.resolve(frontendRoot, "src")
const evidenceDir = __dirname

const require = createRequire(
	path.resolve(frontendRoot, "package.json"),
)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const react = require("@vitejs/plugin-react").default

export default defineConfig({
	root: frontendRoot,
	plugins: [react()],
	resolve: {
		alias: {
			"@": frontendSrc,
			"next/dynamic": path.resolve(frontendSrc, "test/mocks/next-dynamic.tsx"),
			"next/font/google": path.resolve(
				frontendSrc,
				"test/mocks/next-font-google.ts",
			),
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: [path.resolve(frontendSrc, "test/setup.ts")],
		css: false,
		testTimeout: 15_000,
		include: [
			path.resolve(
				evidenceDir,
				"us-007-error-message-surfacing.acceptance.test.tsx",
			),
		],
	},
})
