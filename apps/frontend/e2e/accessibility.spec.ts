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

test.describe("Acessibilidade — tokens globais (anel de foco duplo + zoom de texto)", () => {
	test("o anel de foco do primeiro elemento focável no login usa duas camadas de box-shadow, não outline sólido", async ({
		page,
	}) => {
		await page.goto("/login")
		await page.keyboard.press("Tab")
		const boxShadow = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null
			if (!el) return null
			return window.getComputedStyle(el).boxShadow
		})
		expect(boxShadow).not.toBeNull()
		expect(boxShadow).not.toBe("none")
		const layerCount = (boxShadow?.match(/rgba?\(/g) ?? []).length
		expect(layerCount).toBe(2)
	})

	test("o font-size do body escala quando o font-size da raiz aumenta (unidade relativa, não px fixo)", async ({
		page,
	}) => {
		await page.goto("/login")
		const baselinePx = await page.evaluate(() =>
			Number.parseFloat(window.getComputedStyle(document.body).fontSize),
		)
		await page.evaluate(() => {
			document.documentElement.style.fontSize = "32px"
		})
		const scaledPx = await page.evaluate(() =>
			Number.parseFloat(window.getComputedStyle(document.body).fontSize),
		)
		expect(scaledPx).toBeCloseTo(baselinePx * 2, 1)
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
