/**
 * Runner script: executa acceptance test usando o vitest do apps/frontend.
 *
 * Estratégia: cópia temporária do arquivo de teste em
 * apps/frontend/src/test/acceptance/ para que o vitest do frontend
 * resolva todos os node_modules corretamente.
 *
 * Uso: node run-acceptance.mjs
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const frontendRoot =
	"/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend"
const frontendSrc = path.join(frontendRoot, "src")

const testSrc = path.resolve(__dirname, "us-06-at-risk-members.acceptance.test.tsx")
const testDestDir = path.join(frontendSrc, "test", "acceptance")
const testDest = path.join(testDestDir, "us-06-at-risk-members.acceptance.test.tsx")
const testRelative = path.relative(frontendRoot, testDest)

// Cria diretório e copia o arquivo de teste para dentro do projeto frontend
fs.mkdirSync(testDestDir, { recursive: true })
fs.copyFileSync(testSrc, testDest)

let exitCode = 1
try {
	execSync(`pnpm exec vitest run "${testRelative}"`, {
		cwd: frontendRoot,
		stdio: "inherit",
	})
	exitCode = 0
} catch {
	exitCode = 1
} finally {
	// Remove arquivo copiado e diretório
	try { fs.unlinkSync(testDest) } catch {}
	try { fs.rmdirSync(testDestDir) } catch {}
}

process.exit(exitCode)
