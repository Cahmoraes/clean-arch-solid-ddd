import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import { loginViaUi, provisionUser } from "./helpers/auth"

const SEVERITIES = ["critical", "serious"] as const

async function scan(page: Page, url: string): Promise<void> {
	await page.goto(url)
	// Aguarda o eventual skeleton de boot (refresh transparente) sumir antes de
	// medir, para evitar navegações em segundo plano destruírem o contexto.
	await page
		.getByTestId("auth-boot-skeleton")
		.waitFor({ state: "hidden", timeout: 10_000 })
		.catch(() => undefined)
	await page.waitForLoadState("networkidle")
	const results = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
		.analyze()
	const blocking = results.violations.filter((v) =>
		SEVERITIES.includes(v.impact as (typeof SEVERITIES)[number]),
	)
	if (blocking.length > 0) {
		const summary = blocking
			.map(
				(v) =>
					`- [${v.impact}] ${v.id}: ${v.help}\n  nodes: ${v.nodes
						.slice(0, 3)
						.map((n) => n.target.join(" "))
						.join(" | ")}`,
			)
			.join("\n")
		throw new Error(`Violações axe-core em ${url}:\n${summary}`)
	}
}

test.describe("Acessibilidade — telas públicas", () => {
	test("login não tem violações críticas/sérias", async ({ page }) => {
		await scan(page, "/login")
	})

	test("cadastro não tem violações críticas/sérias", async ({ page }) => {
		await scan(page, "/cadastro")
	})

	test("foco de teclado é visível no login", async ({ page }) => {
		await page.goto("/login")
		await page.keyboard.press("Tab")
		const focused = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null
			if (!el) return null
			const style = window.getComputedStyle(el)
			return {
				tag: el.tagName,
				outline: style.outlineStyle,
				outlineWidth: style.outlineWidth,
				boxShadow: style.boxShadow,
			}
		})
		expect(focused).not.toBeNull()
		// Aceita outline OU box-shadow como indicador visual de foco.
		const hasOutline =
			focused?.outline !== "none" && focused?.outlineWidth !== "0px"
		const hasShadow = focused?.boxShadow !== "none"
		expect(hasOutline || hasShadow).toBe(true)
	})
})

test.describe("Acessibilidade — telas autenticadas", () => {
	test("varredura em /academias, /perfil e /check-ins", async ({
		page,
		request,
	}) => {
		const user = await provisionUser(request, { role: "MEMBER" })
		await loginViaUi(page, user)

		await scan(page, "/academias")
		await scan(page, "/perfil")
		await scan(page, "/check-ins")
	})
})
