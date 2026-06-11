/// <reference types="vitest" />
import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"motion/react": path.resolve(
				__dirname,
				"./src/test/mocks/motion-react.tsx",
			),
			"next/dynamic": path.resolve(
				__dirname,
				"./src/test/mocks/next-dynamic.tsx",
			),
			"next/font/google": path.resolve(
				__dirname,
				"./src/test/mocks/next-font-google.ts",
			),
			"next/navigation": path.resolve(
				__dirname,
				"./src/test/mocks/next-navigation.ts",
			),
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		css: false,
		testTimeout: 15_000,
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
