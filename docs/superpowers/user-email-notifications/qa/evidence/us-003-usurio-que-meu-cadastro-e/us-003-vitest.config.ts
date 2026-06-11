import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const evidenceTestFile = resolve(
	currentDirectory,
	"us-003-email-failure-resilience.acceptance.test.ts",
)
const repositoryRoot = resolve(currentDirectory, "../../../../../../")
const backendSourceRoot = resolve(repositoryRoot, "apps/backend/src")

export default defineConfig({
	resolve: {
		alias: {
			"@": backendSourceRoot,
		},
	},
	test: {
		environment: "node",
		globals: true,
		include: [evidenceTestFile],
	},
})
