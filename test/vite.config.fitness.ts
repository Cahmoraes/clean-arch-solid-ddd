import { defineConfig, mergeConfig } from "vite"

import setupShareConfig from "./vite.config.shared"

export default mergeConfig(
	setupShareConfig,
	defineConfig({
		test: {
			// include: ['**/**/architecture-dependency-check.fit-test.ts'],
			include: ["**/**/archunit.fit-test.ts"],
		},
	}),
)
