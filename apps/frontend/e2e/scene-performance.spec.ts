import { expect, type Page, test } from "@playwright/test"

const STORAGE_KEY = "volt:scene-motion-paused"
const WARMUP_MS = 1_000
const WINDOW_MS = 3_000

// Limites da medição, justificados (FR-023: layout e paint por quadro):
// - Janela de 3s a ~60 fps são ~180 quadros. Uma animação que exige layout ou
//   paint por quadro produziria centenas de eventos; uma composta pela GPU
//   produz zero além de ruído incidental (foco, fonte tardia).
// - Layout: 0. Animar só transform e opacity nunca invalida layout.
// - Paint: no máximo 5 (menos de 3% dos quadros). Tolera repinturas incidentais,
//   mas falha se houver paint por quadro.
// - UpdateLayoutTree: o IntersectionObserver exigido por FR-015 (pausar a cena
//   fora da tela) faz o Chrome recalcular estilo enquanto há animação ativa, no
//   máximo uma vez por quadro. Medido: causado pela presença de animação + IO,
//   não por propriedade cara. Teto de 1,5 recálculo por quadro; com animações
//   pausadas continua 0, o que prova que só animação + IO o gera.
const MAX_LAYOUT_EVENTS = 0
const MAX_PAINT_EVENTS = 5
const maxStyleEvents = (durationMs: number) =>
	Math.ceil((durationMs / 1000) * 60 * 1.5)
const MAX_STYLE_EVENTS_PAUSED = 0

const COUNTED = ["Layout", "UpdateLayoutTree", "Paint"] as const
type CountedEvent = (typeof COUNTED)[number]

interface TraceEvent {
	name?: string
	ph?: string
}

async function traceWindow(
	page: Page,
	durationMs: number,
): Promise<Record<CountedEvent, number>> {
	const client = await page.context().newCDPSession(page)
	const events: TraceEvent[] = []
	client.on("Tracing.dataCollected", (payload) => {
		events.push(...(payload.value as TraceEvent[]))
	})
	const finished = new Promise<void>((resolve) => {
		client.once("Tracing.tracingComplete", () => resolve())
	})
	await client.send("Tracing.start", {
		categories: "devtools.timeline",
		transferMode: "ReportEvents",
	})
	await page.waitForTimeout(durationMs)
	await client.send("Tracing.end")
	await finished
	await client.detach()

	const counts: Record<CountedEvent, number> = {
		Layout: 0,
		UpdateLayoutTree: 0,
		Paint: 0,
	}
	for (const event of events) {
		const name = COUNTED.find((candidate) => candidate === event.name)
		if (name && (event.ph === "X" || event.ph === "B")) counts[name] += 1
	}
	return counts
}

async function runningAnimations(page: Page): Promise<number> {
	return page.evaluate(
		() =>
			document
				.getAnimations()
				.filter((animation) => animation.playState === "running").length,
	)
}

test.describe("Desempenho das cenas no login", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"O trace via CDP exige Chromium",
	)
	test.use({
		contextOptions: { reducedMotion: "no-preference" },
		viewport: { width: 1280, height: 800 },
	})

	test.beforeEach(async ({ page }) => {
		await page.addInitScript((key) => {
			window.localStorage.removeItem(key)
		}, STORAGE_KEY)
		await page.goto("/login")
		await page
			.locator('[data-scene="login"]')
			.waitFor({ state: "visible", timeout: 10_000 })
		await page.waitForTimeout(WARMUP_MS)
	})

	test("a cena animando não gera layout nem paint por quadro", async ({
		page,
	}) => {
		await expect(page.locator('[data-scene="login"]')).toHaveAttribute(
			"data-paused",
			"false",
		)
		// Guarda contra passar sem medir nada: há animação de fato rodando.
		expect(await runningAnimations(page)).toBeGreaterThan(0)

		const counts = await traceWindow(page, WINDOW_MS)

		expect(counts.Layout, "eventos Layout").toBeLessThanOrEqual(
			MAX_LAYOUT_EVENTS,
		)
		expect(
			counts.UpdateLayoutTree,
			"eventos UpdateLayoutTree",
		).toBeLessThanOrEqual(maxStyleEvents(WINDOW_MS))
		expect(counts.Paint, "eventos Paint").toBeLessThanOrEqual(MAX_PAINT_EVENTS)
	})

	test("pausada pelo controle, a atividade da cena cai a zero", async ({
		page,
	}) => {
		expect(await runningAnimations(page)).toBeGreaterThan(0)

		await page.getByRole("button", { name: "Pausar animações" }).click()
		await expect(page.locator('[data-scene="login"]')).toHaveAttribute(
			"data-paused",
			"true",
		)
		await expect(
			page.getByRole("button", { name: "Retomar animações" }),
		).toHaveAttribute("aria-pressed", "true")
		expect(await runningAnimations(page)).toBe(0)

		const counts = await traceWindow(page, WINDOW_MS)

		expect(counts.Layout, "eventos Layout").toBeLessThanOrEqual(
			MAX_LAYOUT_EVENTS,
		)
		expect(
			counts.UpdateLayoutTree,
			"eventos UpdateLayoutTree",
		).toBeLessThanOrEqual(MAX_STYLE_EVENTS_PAUSED)
		expect(counts.Paint, "eventos Paint").toBeLessThanOrEqual(MAX_PAINT_EVENTS)
	})

	test("com movimento reduzido no sistema a cena já nasce sem animação rodando", async ({
		browser,
	}) => {
		const context = await browser.newContext({ reducedMotion: "reduce" })
		const page = await context.newPage()
		await page.goto("/login")
		await page
			.locator('[data-scene="login"]')
			.waitFor({ state: "visible", timeout: 10_000 })
		expect(await runningAnimations(page)).toBe(0)
		await context.close()
	})
})
