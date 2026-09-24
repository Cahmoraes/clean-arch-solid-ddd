import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import { loginViaUi, provisionUser } from "./helpers/auth"

const SEVERITIES = ["critical", "serious"] as const

type Theme = "dark" | "light"

const THEMES: ReadonlyArray<Theme> = ["dark", "light"]

// next-themes guarda a escolha em localStorage sob a chave "theme". O init script
// roda antes da hidratação de toda navegação seguinte desta página.
async function applyTheme(page: Page, theme: Theme): Promise<void> {
	await page.addInitScript((value) => {
		window.localStorage.setItem("theme", value)
	}, theme)
}

// Entradas animadas (fade/stagger) deixam o texto semitransparente por alguns
// instantes e o axe mediria um contraste transitório, não o do estado final.
// O motion mantém opacidade 0 (estilo inline) nos itens do stagger até a vez
// deles e anima via WAAPI ou via JS. Espera então todo elemento animado (inline
// ou com animação finita) chegar a opacidade computada 1, e que isso siga
// valendo depois de um respiro (itens remontados por refetch reiniciam o fade).
// Antes disso, espera os skeletons sumirem: com dados carregando, a lista nem montou.
async function waitForEntranceAnimations(page: Page): Promise<void> {
	await expect(page.getByTestId("skeleton")).toHaveCount(0)
	await expect
		.poll(() =>
			page.evaluate(async () => {
				const countPending = () =>
					Array.from(document.querySelectorAll<HTMLElement>("body *")).filter(
						(el) => {
							const animated =
								el.style.opacity !== "" ||
								el
									.getAnimations()
									.some(
										(a) =>
											a.effect?.getComputedTiming().iterations !== Infinity,
									)
							return animated && window.getComputedStyle(el).opacity !== "1"
						},
					).length
				const before = countPending()
				await new Promise((resolve) => setTimeout(resolve, 400))
				return before + countPending()
			}),
		)
		.toBe(0)
}

async function scan(page: Page, url: string, theme: Theme): Promise<void> {
	await page.goto(url)
	// Aguarda o eventual skeleton de boot (refresh transparente) sumir antes de
	// medir, para evitar navegações em segundo plano destruírem o contexto.
	await page
		.getByTestId("auth-boot-skeleton")
		.waitFor({ state: "hidden", timeout: 10_000 })
		.catch(() => undefined)
	await page
		.locator("#main-content")
		.waitFor({ state: "visible", timeout: 10_000 })
	await waitForEntranceAnimations(page)
	// Guarda: o scan só vale se o tema pedido foi mesmo aplicado.
	await expect(page.locator("html")).toHaveClass(
		theme === "dark" ? /(^|\s)dark(\s|$)/ : /^(?!.*(^|\s)dark(\s|$)).*$/,
	)
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
		throw new Error(`Violações axe-core em ${url} (tema ${theme}):\n${summary}`)
	}
}

for (const theme of THEMES) {
	test.describe(`Acessibilidade — telas públicas (tema ${theme})`, () => {
		test("login não tem violações críticas/sérias", async ({ page }) => {
			await applyTheme(page, theme)
			await scan(page, "/login", theme)
		})

		test("cadastro não tem violações críticas/sérias", async ({ page }) => {
			await applyTheme(page, theme)
			await scan(page, "/cadastro", theme)
		})
	})
}

test.describe("Acessibilidade — foco de teclado (tema padrão)", () => {
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

for (const theme of THEMES) {
	test.describe(`Acessibilidade — telas autenticadas (tema ${theme})`, () => {
		test("varredura em /academias, /perfil e /check-ins", async ({
			page,
			request,
		}) => {
			const user = await provisionUser(request, { role: "MEMBER" })
			await applyTheme(page, theme)
			await loginViaUi(page, user)

			await scan(page, "/academias", theme)
			await scan(page, "/perfil", theme)
			await scan(page, "/check-ins", theme)
		})

		test("varredura em /admin/usuarios e /assinatura", async ({
			page,
			request,
		}) => {
			const user = await provisionUser(request, { role: "ADMIN" })
			await applyTheme(page, theme)
			await loginViaUi(page, user)

			await scan(page, "/admin/usuarios", theme)
			await scan(page, "/assinatura", theme)
		})
	})
}
