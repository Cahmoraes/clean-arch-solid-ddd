/// <reference types="vitest" />
import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const frontendRoot = path.resolve(
	__dirname,
	"../../../../../../apps/frontend",
)

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.join(frontendRoot, "src"),
			"next/dynamic": path.join(
				frontendRoot,
				"src/test/mocks/next-dynamic.tsx",
			),
			"next/font/google": path.join(
				frontendRoot,
				"src/test/mocks/next-font-google.ts",
			),
			"next/navigation": path.join(
				frontendRoot,
				"src/test/mocks/next-navigation.ts",
			),
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: [path.join(frontendRoot, "src/test/setup.ts")],
		css: false,
		testTimeout: 15_000,
		include: [
			"us-001-navigation-palette-open-close.acceptance.test.tsx",
		],
	},
})
