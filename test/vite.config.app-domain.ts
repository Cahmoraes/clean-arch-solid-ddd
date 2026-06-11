import { defineConfig, mergeConfig } from "vitest/config"

import setupShareConfig from "./vite.config.shared"

export default mergeConfig(
	setupShareConfig,
	defineConfig({
		test: {
			include: ["**/**/*.test.ts"],
			coverage: {
				include: ["**/src/**"],
				exclude: [
					"**/**/@types",
					"**/node_modules/**",
					"**/**/*.business-flow-test.ts",
					"**/**/*.controller.ts",
					"**/infra/**",
					"**/**/*.test.ts",
				],
			},
		},
	}),
)
