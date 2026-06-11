/// <reference types="vitest" />
import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(
				__dirname,
				"../../../../../../apps/frontend/src",
			),
			"next/dynamic": path.resolve(
				__dirname,
				"../../../../../../apps/frontend/src/test/mocks/next-dynamic.tsx",
			),
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: [
			path.resolve(
				__dirname,
				"../../../../../../apps/frontend/src/test/setup.ts",
			),
		],
		css: false,
		testTimeout: 15_000,
		include: [
			path.resolve(__dirname, "*.acceptance.test.tsx"),
		],
	},
})
