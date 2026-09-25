import { expect, test } from "@playwright/test"

const BOOT_PLAYED_KEY = "volt:boot-played"
const MOTION_PAUSED_KEY = "volt:scene-motion-paused"

function countBootAnimations(): number {
	return document.getAnimations().filter((animation) => {
		const target = (animation.effect as KeyframeEffect | null)?.target
		return target?.hasAttribute("data-boot") ?? false
	}).length
}

test.describe("boot de terminal por sessão", () => {
	test("primeira carga anima o boot; recarregar na mesma aba não repete; aba nova repete", async ({
		page,
		context,
	}) => {
		await page.goto("/login")
		await page.waitForSelector('[data-boot="title"]')
		const runningBefore = await page.evaluate(
			() => document.getAnimations().length,
		)
		expect(runningBefore).toBeGreaterThan(0)

		// Polling em vez de um `waitForTimeout` fixo: sob paralelismo de workers
		// (dev server compartilhado), a hidratação que liga o listener do boot
		// pode ultrapassar os ~600ms do boot; o poll espera só o necessário.
		await expect
			.poll(() =>
				page.evaluate(
					(key) => window.sessionStorage.getItem(key),
					BOOT_PLAYED_KEY,
				),
			)
			.toBe("true")

		await page.reload()
		await expect(page.locator("html")).toHaveAttribute("data-boot-played", "")
		const runningAfterReload = await page.evaluate(countBootAnimations)
		expect(runningAfterReload).toBe(0)

		const newPage = await context.newPage()
		await newPage.goto("/login")
		await newPage.waitForSelector('[data-boot="title"]')
		const runningNewTab = await newPage.evaluate(
			() => document.getAnimations().length,
		)
		expect(runningNewTab).toBeGreaterThan(0)
		await newPage.close()
	})

	test("com a pausa salva no localStorage, o boot não toca", async ({
		page,
	}) => {
		await page.addInitScript(
			([key, value]) => window.localStorage.setItem(key, value),
			[MOTION_PAUSED_KEY, "true"],
		)
		await page.goto("/login")
		await expect(page.locator("html")).toHaveAttribute("data-motion-paused", "")
		const bootAnimations = await page.evaluate(countBootAnimations)
		expect(bootAnimations).toBe(0)
	})

	test("a home exibe a cena sunset pausada quando a preferência está ativa", async ({
		page,
	}) => {
		await page.addInitScript(
			([key, value]) => window.localStorage.setItem(key, value),
			[MOTION_PAUSED_KEY, "true"],
		)
		await page.goto("/")
		await expect(page.locator('[data-scene="sunset"]')).toHaveAttribute(
			"data-paused",
			"true",
		)
	})
})
