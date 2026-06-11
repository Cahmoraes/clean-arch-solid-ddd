import { resolve } from "node:path"

const repoRoot = "/home/cahmoraes/projects/estudo/clean-arch-solid-ddd"

export default {
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
			"docs/superpowers/forgot-password/qa/evidence/us-005-notificado-email-senha-alterada/us-005-password-alert-email.acceptance.test.ts",
		],
	},
}
