import { defineConfig, mergeConfig } from "vitest/config"
import setupShareConfig from "./vite.config.shared"

export default mergeConfig(
	setupShareConfig,
	defineConfig({
		define: {
			"process.env.NODE_ENV": JSON.stringify("test"),
		},
		test: {
			pool: "forks",
			fileParallelism: false,
			hookTimeout: 30000,
			testTimeout: 30000,
			include: ["**/**/*.contract-test.ts"],
			setupFiles: ["./test/contract/setup.ts"],
			env: {
				NODE_ENV: "test",
			},
		},
	}),
)
