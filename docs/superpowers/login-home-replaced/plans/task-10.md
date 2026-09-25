# Task 10: E2E de desempenho, pausa e boot por sessão [FR-013, FR-015, FR-016, FR-017]

**Status:** DONE

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** standard

## Visão Geral

Fecha a feature com e2e: confirma que `scene-performance.spec.ts` continua passando com o `MotionToggle` real (não mais um botão inexistente) e adiciona `boot-session.spec.ts`, cobrindo o boot uma vez por sessão (recarregar não repete, aba nova repete), a pausa salva desligando o boot, e a cena `sunset` pausada na home.

## Arquivos

- Modify: `apps/frontend/e2e/scene-performance.spec.ts` (só se algum seletor divergir; ver Step 1)
- Create: `apps/frontend/e2e/boot-session.spec.ts`

## Interfaces

- **Consome:** `MotionToggle` no header público com `aria-pressed` e rótulos "Pausar animações"/"Retomar animações" (task-03, task-04); atributos `data-boot`, `data-boot-played`, `data-motion-paused` e `BOOT_PLAYED_KEY = "volt:boot-played"` (task-07); hero do login com `data-boot` (task-08); seletor `[data-scene="sunset"]` com `data-paused` (task-05, task-09).
- **Produz:** N/A.

### Skills a invocar

- `playwright-cli`: `page.addInitScript`, `context.newPage()`, `document.getAnimations()` e `page.waitForTimeout` para orquestrar sessão/aba/tempo real.
- `test-antipatterns`: e2e não deve reimplementar a lógica de storage — só observar o efeito (atributos, `sessionStorage`, animações).
- `no-workarounds`: nenhum `page.waitForTimeout` arbitrário além do necessário para passar dos ~600ms do boot; preferir `waitForSelector`/`expect(...).toHaveAttribute` com polling do Playwright quando possível.

## Passos

- **Step 1: Confirmar que os seletores de `scene-performance.spec.ts` continuam válidos**

O arquivo já espera `getByRole("button", { name: "Pausar animações" })` e, após o clique, `"Retomar animações"` com `aria-pressed`. O `MotionToggle` da task-03 usa exatamente esses dois rótulos e `aria-pressed`, então nenhuma edição é esperada neste arquivo. Rodar o arquivo (Step 2) confirma isso; se algum rótulo divergir, ajustar só o texto do seletor, sem mudar os critérios de `Layout`/`Paint`.

- **Step 2: Run test to verify it passes**

Run: `pnpm --filter frontend exec playwright test e2e/scene-performance.spec.ts`
Expected: PASS — os 3 testes do arquivo (cena animando sem `Layout`/no máx. 5 `Paint` em 3s; pausa pelo `MotionToggle` real leva a atividade a zero; reduced motion já nasce sem animação), agora com o `MotionToggle` de verdade no lugar do botão que antes não existia.

- **Step 3: Review Focus: Recarregar na mesma aba não repete o boot; aba nova repete — Write the test**

```ts
// apps/frontend/e2e/boot-session.spec.ts
import { expect, test } from "@playwright/test"

const BOOT_PLAYED_KEY = "volt:boot-played"
const MOTION_PAUSED_KEY = "volt:scene-motion-paused"

function countBootAnimations(): number {
	return document
		.getAnimations()
		.filter((animation) => {
			const target = animation.effect?.target as Element | undefined
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
		const runningBefore = await page.evaluate(() =>
			document.getAnimations().length,
		)
		expect(runningBefore).toBeGreaterThan(0)

		await page.waitForTimeout(700)
		const bootPlayed = await page.evaluate(
			(key) => window.sessionStorage.getItem(key),
			BOOT_PLAYED_KEY,
		)
		expect(bootPlayed).toBe("true")

		await page.reload()
		await expect(page.locator("html")).toHaveAttribute("data-boot-played", "")
		const runningAfterReload = await page.evaluate(countBootAnimations)
		expect(runningAfterReload).toBe(0)

		const newPage = await context.newPage()
		await newPage.goto("/login")
		await newPage.waitForSelector('[data-boot="title"]')
		const runningNewTab = await newPage.evaluate(() =>
			document.getAnimations().length,
		)
		expect(runningNewTab).toBeGreaterThan(0)
		await newPage.close()
	})

	test("com a pausa salva no localStorage, o boot não toca", async ({ page }) => {
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
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec playwright test e2e/boot-session.spec.ts`
Expected: PASS — os 3 testes: boot toca na primeira carga e não recarregando na mesma aba, mas toca de novo em aba nova (Review Focus); pausa salva desliga o boot; a home mostra `[data-scene="sunset"]` com `data-paused="true"` quando pausado.

- **Step 5: Commit**

```bash
git add apps/frontend/e2e/boot-session.spec.ts
git commit -m "test(e2e): boot por sessao, pausa e cena sunset pausada"
```

## Critérios de Sucesso

- `scene-performance.spec.ts` passa com o `MotionToggle` real (FR-015, FR-017).
- Recarregar `/login` na mesma aba não repete o boot; uma aba nova repete (FR-013).
- `localStorage["volt:scene-motion-paused"] === "true"` desliga o boot desde a primeira carga (FR-016 herdado, FR-013).
- `/` exibe `[data-scene="sunset"]` com `data-paused="true"` quando a preferência de pausa está ativa (FR-017).
