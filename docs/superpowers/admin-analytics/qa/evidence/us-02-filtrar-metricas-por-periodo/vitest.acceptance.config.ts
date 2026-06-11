/// <reference types="vitest" />

// Run from apps/frontend: npx vitest run --config <absolute-path-to-this-file>

const FRONTEND_NM =
	"/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend/node_modules"

const FRONTEND_ROOT =
	"/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend"

const EVIDENCE_DIR =
	"/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/docs/superpowers/admin-analytics/qa/evidence/us-02-filtrar-metricas-por-periodo"

export default {
	plugins: [],
	root: FRONTEND_ROOT,
	resolve: {
		alias: {
			"@": `${FRONTEND_ROOT}/src`,
			"next/navigation": `${FRONTEND_ROOT}/src/test/mocks/next-navigation.ts`,
			// Explicitly map bare specifiers to their location in the frontend's node_modules
			"@testing-library/react": `${FRONTEND_NM}/@testing-library/react`,
			"@testing-library/jest-dom": `${FRONTEND_NM}/@testing-library/jest-dom`,
			"@testing-library/user-event": `${FRONTEND_NM}/@testing-library/user-event`,
			vitest: `${FRONTEND_NM}/vitest`,
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: [`${FRONTEND_ROOT}/src/test/setup.ts`],
		css: false,
		include: [
			`${EVIDENCE_DIR}/*.acceptance.test.ts`,
			`${EVIDENCE_DIR}/*.acceptance.test.tsx`,
		],
	},
}
