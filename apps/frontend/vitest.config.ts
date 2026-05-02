/// <reference types="vitest" />
import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		css: false,
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		exclude: [
			"node_modules",
			"e2e",
			".next",
			"playwright-report",
			"test-results",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "./coverage",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/**/*.{test,spec}.{ts,tsx}",
				"src/test/**",
				"src/**/*.d.ts",
				"src/app/**/layout.tsx",
				"src/app/**/page.tsx",
			],
		},
	},
})
