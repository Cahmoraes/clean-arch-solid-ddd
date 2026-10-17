import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const app = path.resolve(__dirname, "../../../../../../apps/frontend")

export default defineConfig({
	root: app,
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(app, "src"),
			"motion/react": path.resolve(app, "src/test/mocks/motion-react.tsx"),
			"next/dynamic": path.resolve(app, "src/test/mocks/next-dynamic.tsx"),
			"next/font/google": path.resolve(app, "src/test/mocks/next-font-google.ts"),
			"next/navigation": path.resolve(app, "src/test/mocks/next-navigation.ts"),
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: [path.resolve(app, "src/test/setup.ts")],
		css: false,
		testTimeout: 15_000,
		include: [path.resolve(__dirname, "*.acceptance.test.tsx")],
	},
})
