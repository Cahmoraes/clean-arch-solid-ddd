/**
 * Runner script: executa acceptance test usando a API programática do vitest
 * a partir do contexto do apps/frontend (onde vitest está instalado).
 */
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Path absoluto para o frontend
const frontendRoot =
	"/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend"
const frontendSrc = path.join(frontendRoot, "src")
const frontendNodeModules = path.join(frontendRoot, "node_modules")
const testFile = path.resolve(
	__dirname,
	"us-007-error-message-surfacing.acceptance.test.tsx",
)

// Criar require com base nos node_modules do frontend
const req = createRequire(path.join(frontendNodeModules, ".package-lock.json"))
const { startVitest } = req("vitest/node")
const react = req("@vitejs/plugin-react")

const fnm = path.join(frontendNodeModules)

function resolveFromFrontend(pkg) {
	return path.join(fnm, pkg)
}

const vitest = await startVitest("test", [testFile], {
	root: frontendRoot,
	config: false,
	plugins: [react.default()],
	resolve: {
		alias: [
			{
				find: /^@\//,
				replacement: frontendSrc + "/",
			},
			{
				find: "next/dynamic",
				replacement: path.join(frontendSrc, "test/mocks/next-dynamic.tsx"),
			},
			{
				find: "next/font/google",
				replacement: path.join(frontendSrc, "test/mocks/next-font-google.ts"),
			},
		],
	},
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: [path.join(frontendSrc, "test/setup.ts")],
		css: false,
		testTimeout: 15000,
		include: [testFile],
		reporters: ["verbose"],
	},
})

await vitest.close()
process.exit(vitest.state.getCountOfFailedTests() > 0 ? 1 : 0)
