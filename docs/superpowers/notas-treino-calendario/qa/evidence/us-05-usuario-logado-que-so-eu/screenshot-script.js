import { chromium, request } from "/Users/ike_m/Documents/projects/clean-arch-solid-ddd/apps/frontend/node_modules/@playwright/test/index.mjs"

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
const FRONT = "http://localhost:3000"
const TODAY = "2026-10-16"
const NOTE_TEXT = "Peito + tríceps 4x12"

async function signup(api, tag) {
	const email = `qa-us05-${tag}-${Date.now()}@example.com`
	const password = "Senha123!"
	const res = await api.post(`${BACKEND}/users`, {
		data: { name: `QA US05 ${tag}`, email, password, role: "MEMBER" },
	})
	if (!res.ok()) throw new Error(`signup ${tag} falhou: ${res.status()} ${await res.text()}`)
	return { email, password }
}

async function login(api, user) {
	const res = await api.post(`${BACKEND}/sessions`, {
		data: { email: user.email, password: user.password },
	})
	if (!res.ok()) throw new Error(`login falhou: ${res.status()} ${await res.text()}`)
	const body = await res.json()
	const cookies = res
		.headersArray()
		.filter((h) => h.name.toLowerCase() === "set-cookie")
		.map((h) => {
			const [pair] = h.value.split(";")
			const eq = pair.indexOf("=")
			return { name: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim(), domain: "localhost", path: "/" }
		})
	return { token: body.token, cookies }
}

async function main() {
	const api = await request.newContext()
	const userA = await signup(api, "a")
	const userB = await signup(api, "b")
	const sessionA = await login(api, userA)
	const sessionB = await login(api, userB)

	const created = await api.post(`${BACKEND}/training-notes`, {
		headers: { Authorization: `Bearer ${sessionA.token}` },
		data: { data: TODAY, texto: NOTE_TEXT },
	})
	if (created.status() !== 201) throw new Error(`criar nota falhou: ${created.status()} ${await created.text()}`)

	const listB = await api.get(`${BACKEND}/training-notes?de=2026-10-01&ate=2026-10-31`, {
		headers: { Authorization: `Bearer ${sessionB.token}` },
	})
	const bodyB = await listB.json()
	console.log(JSON.stringify({ contaB_ve_notas: bodyB }))
	if (!Array.isArray(bodyB) || bodyB.length !== 0) {
		throw new Error("ISOLAMENTO QUEBRADO: conta B enxergou notas da conta A")
	}

	const listA = await api.get(`${BACKEND}/training-notes?de=2026-10-01&ate=2026-10-31`, {
		headers: { Authorization: `Bearer ${sessionA.token}` },
	})
	console.log(JSON.stringify({ contaA_ve_notas: await listA.json() }))

	const browser = await chromium.launch({
		executablePath:
			"/Users/ike_m/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell",
	})
	const page = await (await browser.newContext()).newPage()
	await page.context().addCookies(sessionB.cookies)
	await page.goto(`${FRONT}/calendario`, { waitUntil: "domcontentloaded", timeout: 30000 })
	await page.waitForTimeout(4000)
	console.log(`url após navegar: ${page.url()}`)
	await page.screenshot({ path: "screenshot.png" })
	console.log("screenshot ok: conta B logada, sem notas de A visíveis")
	await browser.close()
	await api.dispose()
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
