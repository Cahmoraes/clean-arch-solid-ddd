import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const evidenceTestFile = resolve(
	currentDirectory,
	"us-003-reset-password-min-length.acceptance.test.ts",
)
const repositoryRoot = resolve(currentDirectory, "../../../../../../")
const backendRoot = resolve(repositoryRoot, "apps/backend")

export default defineConfig({
	root: backendRoot,
	resolve: {
		alias: {
			"@": resolve(backendRoot, "src"),
			test: resolve(backendRoot, "test"),
		},
	},
	test: {
		environment: "node",
		globals: true,
		sequence: {
			concurrent: false,
		},
		setupFiles: resolve(backendRoot, "test/setup-test.ts"),
		include: [evidenceTestFile],
	},
})
