import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

const repoRoot = "/home/cahmoraes/projects/estudo/clean-arch-solid-ddd"

export default defineConfig({
	root: repoRoot,
	resolve: {
		alias: {
			"@": resolve(repoRoot, "apps/backend/src"),
			test: resolve(repoRoot, "apps/backend/test"),
		},
	},
	test: {
		environment: "node",
		globals: true,
		sequence: {
			concurrent: false,
		},
		setupFiles: resolve(repoRoot, "apps/backend/test/setup-test.ts"),
		include: [
			"docs/superpowers/user-email-notifications/qa/evidence/us-002-usurio-que-acabou-de-definir/us-002-password-alert-on-define.acceptance.test.ts",
		],
	},
})
