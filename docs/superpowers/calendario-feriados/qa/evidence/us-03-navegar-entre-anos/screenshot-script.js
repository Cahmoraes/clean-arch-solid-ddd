import { createRequire } from "node:module"

const requireFromFrontend = createRequire(
	new URL("../../../../../../apps/frontend/package.json", import.meta.url),
)
const { chromium } = requireFromFrontend("@playwright/test")

const appBaseUrl = "http://localhost:3000"
const screenshotPath =
	"docs/superpowers/calendario-feriados/qa/evidence/us-03-navegar-entre-anos/screenshot.png"

function encodeBase64Url(value) {
	return Buffer.from(JSON.stringify(value))
		.toString("base64url")
		.replace(/=+$/u, "")
}

function makeJwt(payload) {
	return [
		encodeBase64Url({ alg: "none", typ: "JWT" }),
		encodeBase64Url(payload),
		"qa-signature",
	].join(".")
}

const accessToken = makeJwt({
	sub: "qa-us-03",
	role: "MEMBER",
	exp: Math.floor(Date.now() / 1000) + 60 * 60,
})

const holidaysByYear = {
	2025: [{ date: "2025-12-25", name: "Natal", type: "national" }],
	2026: [{ date: "2026-04-21", name: "Tiradentes", type: "national" }],
	2027: [
		{
			date: "2027-01-01",
			name: "Confraternização Universal",
			type: "national",
		},
	],
}

const corsHeaders = {
	"access-control-allow-origin": appBaseUrl,
	"access-control-allow-credentials": "true",
	"access-control-allow-methods": "GET,PATCH,OPTIONS",
	"access-control-allow-headers": "authorization,content-type",
}

const browser = await chromium.launch()
const context = await browser.newContext({
	baseURL: appBaseUrl,
	viewport: { width: 1440, height: 1000 },
})

try {
	await context.addCookies([
		{
			name: "refreshToken",
			value: "qa-refresh-token",
			domain: "localhost",
			path: "/",
			httpOnly: true,
			sameSite: "Lax",
		},
	])

	const page = await context.newPage()

	await page.route("http://localhost:3333/**", async (route) => {
		const request = route.request()
		const { pathname } = new URL(request.url())
		if (request.method() === "OPTIONS") {
			await route.fulfill({ status: 204, headers: corsHeaders })
			return
		}
		if (pathname === "/sessions/refresh") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				headers: corsHeaders,
				body: JSON.stringify({ token: accessToken }),
			})
			return
		}
		if (pathname === "/users/me") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				headers: corsHeaders,
				body: JSON.stringify({
					id: "qa-us-03",
					name: "Usuário QA",
					email: "qa-us-03@example.com",
					role: "MEMBER",
				}),
			})
			return
		}
		await route.fulfill({
			status: 404,
			contentType: "application/json",
			headers: corsHeaders,
			body: JSON.stringify({ message: "Rota não mockada" }),
		})
	})

	await page.route(
		"https://brasilapi.com.br/api/feriados/v1/:year",
		async (route) => {
			const year = route.request().url().split("/").at(-1)
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(holidaysByYear[year] ?? []),
			})
		},
	)

	await page.goto("/calendario")
	await page.getByRole("heading", { name: "Calendário 2026" }).waitFor()
	await page
		.getByRole("button", { name: "Ir para 2025 (ano anterior)" })
		.click()
	await page.getByRole("heading", { name: "Calendário 2025" }).waitFor()
	await page.getByText("Natal").first().waitFor()
	await page
		.getByRole("button", { name: "Ir para 2026 (ano seguinte)" })
		.click()
	await page.getByRole("heading", { name: "Calendário 2026" }).waitFor()
	await page.getByText("Tiradentes").first().waitFor()
	await page
		.getByRole("button", { name: "Ir para 2027 (ano seguinte)" })
		.click()
	await page.getByRole("heading", { name: "Calendário 2027" }).waitFor()
	await page.getByText("Confraternização Universal").first().waitFor()
	await page.screenshot({ path: screenshotPath, fullPage: true })
} finally {
	await browser.close()
}
