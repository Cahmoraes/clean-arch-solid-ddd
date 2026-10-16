const { chromium } = require("@playwright/test")

const BASE_URL = "http://localhost:3000"
const BACKEND_URL = process.env.BACKEND_PORT
	? `http://localhost:${process.env.BACKEND_PORT}`
	: "http://localhost:3333"
const SHOT =
	"docs/superpowers/notas-treino-calendario/qa/evidence/us-02-usuario-logado-editar-a-nota/screenshot.png"

async function main() {
	const suffix = Date.now().toString(36)
	const user = {
		name: `QA US02 ${suffix}`,
		email: `qa-us02-${suffix}@example.com`,
		password: "Senha123!",
	}
	const signup = await fetch(`${BACKEND_URL}/users`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(user),
	})
	if (!signup.ok) throw new Error(`signup falhou: ${signup.status}`)

	const browser = await chromium.launch({
		executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	})
	try {
		const page = await browser.newPage()
		await page.goto(`${BASE_URL}/login`)
		await page.getByLabel(/e-mail/i).fill(user.email)
		await page.getByLabel(/^senha$/i).fill(user.password)
		await page.getByTestId("login-submit").click()
		await page.waitForURL(/\/(inicio|calendario)/, { timeout: 15000 })

		await page.goto(`${BASE_URL}/calendario`)
		await page.getByTestId("nota-bar-2026-10-16").waitFor({ timeout: 15000 }).catch(() => null)

		// Garante que existe uma nota: cria pelo modal se o dia estiver vazio.
		const bar = page.getByTestId("nota-bar-2026-10-16")
		if ((await bar.count()) === 0) {
			await page.getByRole("button", { name: /16 de outubro/i }).click()
			await page.getByLabel(/nota do treino/i).fill("Peito + tríceps 4x12")
			await page.getByRole("button", { name: /^salvar$/i }).click()
			await page.getByTestId("nota-bar-2026-10-16").waitFor({ timeout: 15000 })
		}

		// Estado da história: modal em modo edição com a nota carregada.
		await page.getByTestId("nota-bar-2026-10-16").click()
		await page.getByText(/edite o texto da nota ou exclua/i).waitFor({ timeout: 15000 })
		await page.screenshot({ path: SHOT })
		console.log(`screenshot salva em ${SHOT}`)
	} finally {
		await browser.close()
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
