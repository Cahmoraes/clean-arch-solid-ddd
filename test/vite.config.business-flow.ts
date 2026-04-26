import { defineConfig, mergeConfig } from "vitest/config"

import setupShareConfig from "./vite.config.shared"

export default mergeConfig(
	setupShareConfig,
	defineConfig({
		test: {
			include: ["**/**/*.business-flow-test.ts"],
		},
	}),
)
