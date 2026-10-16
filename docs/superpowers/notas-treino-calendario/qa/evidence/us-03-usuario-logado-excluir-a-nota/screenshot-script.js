/* QA US-03 — screenshot da confirmacao de exclusao de nota de treino.
 * Uso: node docs/superpowers/notas-treino-calendario/qa/evidence/us-03-usuario-logado-excluir-a-nota/screenshot-script.mjs
 * (a partir da raiz do repo). Requer frontend em http://localhost:3000,
 * backend em http://localhost:3333 e Google Chrome em /Applications.
 */
import { randomUUID } from "node:crypto"
import { chromium } from "/Users/ike_m/Documents/projects/clean-arch-solid-ddd/apps/frontend/node_modules/@playwright/test/index.mjs"

const FRONTEND_URL = "http://localhost:3000"
const BACKEND_URL = "http://localhost:3333"
const SCREENSHOT_PATH =
	"docs/superpowers/notas-treino-calendario/qa/evidence/us-03-usuario-logado-excluir-a-nota/screenshot.png"

async function main() {
	const suffix = randomUUID().slice(0, 8)
	const user = {
		name: `QA US03 ${suffix}`,
		email: `qa-us03-${suffix}@example.com`,
		password: "Senha123!",
	}

	// 1. Signup via API.
	const signup = await fetch(`${BACKEND_URL}/users`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ ...user, role: "MEMBER" }),
	})
	if (!signup.ok) throw new Error(`signup falhou: ${signup.status} ${await signup.text()}`)

	// 2. Login via API para obter o token e semear a nota do dia 2026-10-16.
	const login = await fetch(`${BACKEND_URL}/sessions`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email: user.email, password: user.password }),
	})
	if (!login.ok) throw new Error(`login API falhou: ${login.status} ${await login.text()}`)
	const { token } = await login.json()
	const nota = await fetch(`${BACKEND_URL}/training-notes`, {
		method: "POST",
		headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify({ data: "2026-10-16", texto: "Peito + tríceps 4x12" }),
	})
	if (!nota.ok) throw new Error(`criar nota falhou: ${nota.status} ${await nota.text()}`)

	// 3. Login via UI e navegacao ate o calendario.
	const browser = await chromium.launch({
		executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	})
	const page = await browser.newPage()
	try {
		await page.goto(`${FRONTEND_URL}/login`)
		await page.getByLabel("E-mail").fill(user.email)
		await page.getByLabel("Senha").fill(user.password)
		await page.getByTestId("login-submit").click()
		await page.waitForURL("**/inicio**", { timeout: 30_000 })

		await page.goto(`${FRONTEND_URL}/calendario`)
		await page.getByTestId("nota-bar-2026-10-16").click({ timeout: 15_000 })
		await page.getByRole("button", { name: /excluir/i }).click({ timeout: 10_000 })
		await page.getByRole("button", { name: /confirmar/i }).waitFor({ timeout: 10_000 })
		await page.screenshot({ path: SCREENSHOT_PATH })
		console.log(`screenshot salvo em ${SCREENSHOT_PATH}`)
	} finally {
		await browser.close()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
