# Task 17: Medição de paint das cenas no Playwright [FR-023]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** capable

**Depends on:** task-05, task-06, task-08, task-09

## Visão Geral

Prova em navegador real que a cena animada do login não gera quadros de layout nem de paint por quadro, e que o controle "Pausar animações" de fato para a atividade. Não existe hoje padrão de medição de performance nos e2e; esta tarefa introduz o primeiro, usando um trace do Chrome DevTools Protocol (`Tracing`) durante uma janela de 3 segundos, com limites explícitos justificados no próprio teste. Se a medição falhar, a causa é corrigida na animação (tarefas 7 e 8), não no limite.

## Arquivos

- Create: `apps/frontend/e2e/scene-performance.spec.ts`
- Modify (só se a medição falhar): `apps/frontend/src/app/globals.css`, `apps/frontend/src/components/ui/pixel-scene.tsx`

## Interfaces

- **Consome:**
  - De task-09: a página `/login` renderiza `svg[data-scene="login"]` com atributo `data-paused` (`"false"` animando, `"true"` pausada) na coluna de marca (visível em viewport de 1280px).
  - De task-08: `.pixel-scene .pixel-scene-beam` e `.pixel-scene .pixel-scene-window` com animações CSS (`sceneBeamDrift`, `sceneWindowTwinkle`) e `animation-play-state: paused` sob `data-paused="true"`.
  - De task-06: o `PublicShell` (que envolve `/login`) exibe o botão com nome acessível "Pausar animações" (vira "Retomar animações" ao clicar).
  - De task-05: a preferência manual fica em `localStorage`, chave `volt:scene-motion-paused`.
- **Produz:** `apps/frontend/e2e/scene-performance.spec.ts` (nenhum símbolo exportado): `traceWindow(page: Page, durationMs: number): Promise<Record<"Layout" | "UpdateLayoutTree" | "Paint", number>>` e `runningAnimations(page: Page): Promise<number>`, internos ao arquivo.

### Conformidade com as Skills Padrão

- `playwright-cli`: `page.context().newCDPSession(page)` com `Tracing.start`/`Tracing.end`, seletores por papel e atributo, projeto único chromium.
- `wcag-audit-patterns`: o teste confirma que o controle de pausa (WCAG 2.2.2) realmente para as animações em navegador real.
- `test-antipatterns`: sem mocks (`page.route`); a asserção de "animação rodando" impede um resultado vazio que passe sem medir nada.
- `no-workarounds`: limite de medição não é relaxado para passar; falha se corrige compondo a animação corretamente.

## Passos

- **Step 1: Confirm the environment for the e2e run**

Run: `pnpm --filter backend docker:up`
Expected: PostgreSQL, Redis e RabbitMQ em execução (idempotente). O `webServer` do Playwright sobe backend e frontend; a página `/login` só precisa do frontend, mas o `webServer` espera o `/health-check` do backend.

- **Step 2: Write the failing test**

Criar `apps/frontend/e2e/scene-performance.spec.ts`:

```ts
import { expect, type Page, test } from "@playwright/test"

const STORAGE_KEY = "volt:scene-motion-paused"
const WARMUP_MS = 1_000
const WINDOW_MS = 3_000

// Limites da medição, justificados:
// - Janela de 3s a ~60 fps são ~180 quadros. Uma animação que exige layout ou
//   paint por quadro produziria centenas de eventos; uma composta pela GPU
//   produz zero além de ruído incidental (foco, fonte tardia).
// - Layout e UpdateLayoutTree: 0. Animar só transform e opacity nunca invalida
//   layout nem estilo por quadro; qualquer evento aqui indica propriedade cara.
// - Paint: no máximo 5 (menos de 3% dos quadros). Tolera repinturas incidentais,
//   mas falha se houver paint por quadro.
const MAX_LAYOUT_EVENTS = 0
const MAX_STYLE_EVENTS = 0
const MAX_PAINT_EVENTS = 5

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
			document.getAnimations().filter((animation) => animation.playState === "running")
				.length,
	)
}

test.describe("Desempenho das cenas no login", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"O trace via CDP exige Chromium",
	)
	test.use({
		reducedMotion: "no-preference",
		viewport: { width: 1280, height: 800 },
	})

	test.beforeEach(async ({ page }) => {
		await page.addInitScript((key) => {
			window.localStorage.removeItem(key)
		}, STORAGE_KEY)
		await page.goto("/login")
		await page
			.locator('svg[data-scene="login"]')
			.waitFor({ state: "visible", timeout: 10_000 })
		await page.waitForTimeout(WARMUP_MS)
	})

	test("a cena animando não gera layout nem paint por quadro", async ({
		page,
	}) => {
		await expect(page.locator('svg[data-scene="login"]')).toHaveAttribute(
			"data-paused",
			"false",
		)
		// Guarda contra passar sem medir nada: há animação de fato rodando.
		expect(await runningAnimations(page)).toBeGreaterThan(0)

		const counts = await traceWindow(page, WINDOW_MS)

		expect(counts.Layout, "eventos Layout").toBeLessThanOrEqual(MAX_LAYOUT_EVENTS)
		expect(counts.UpdateLayoutTree, "eventos UpdateLayoutTree").toBeLessThanOrEqual(
			MAX_STYLE_EVENTS,
		)
		expect(counts.Paint, "eventos Paint").toBeLessThanOrEqual(MAX_PAINT_EVENTS)
	})

	test("pausada pelo controle, a atividade da cena cai a zero", async ({
		page,
	}) => {
		expect(await runningAnimations(page)).toBeGreaterThan(0)

		await page.getByRole("button", { name: "Pausar animações" }).click()
		await expect(page.locator('svg[data-scene="login"]')).toHaveAttribute(
			"data-paused",
			"true",
		)
		await expect(
			page.getByRole("button", { name: "Retomar animações" }),
		).toHaveAttribute("aria-pressed", "true")
		expect(await runningAnimations(page)).toBe(0)

		const counts = await traceWindow(page, WINDOW_MS)

		expect(counts.Layout, "eventos Layout").toBeLessThanOrEqual(MAX_LAYOUT_EVENTS)
		expect(counts.UpdateLayoutTree, "eventos UpdateLayoutTree").toBeLessThanOrEqual(
			MAX_STYLE_EVENTS,
		)
		expect(counts.Paint, "eventos Paint").toBeLessThanOrEqual(MAX_PAINT_EVENTS)
	})

	test("com movimento reduzido no sistema a cena já nasce sem animação rodando", async ({
		browser,
	}) => {
		const context = await browser.newContext({ reducedMotion: "reduce" })
		const page = await context.newPage()
		await page.goto("/login")
		await page
			.locator('svg[data-scene="login"]')
			.waitFor({ state: "visible", timeout: 10_000 })
		expect(await runningAnimations(page)).toBe(0)
		await context.close()
	})
})
```

- **Step 3: Run test to verify it fails or measures a real regression**

Run: `pnpm --filter frontend e2e e2e/scene-performance.spec.ts`
Expected: o resultado depende do navegador real e só a execução o revela. Se as tarefas 6, 8 e 9 estiverem completas, os três testes passam ou o primeiro falha com `eventos Paint: expected <n> to be <= 5` (ou `Layout`/`UpdateLayoutTree` acima de 0), mostrando a contagem medida. Se falhar antes disso com `data-paused` diferente de `false` ou com `runningAnimations` igual a 0, a cena do login (tarefa 9) ou o CSS (tarefa 8) não está aplicado.

- **Step 4: Write minimal implementation**

Só há código a escrever se a medição do passo 3 estourar o limite. Nunca subir `MAX_*_EVENTS` para passar. Investigar a causa, nesta ordem:

4a. Layout ou `UpdateLayoutTree` acima de 0: alguma propriedade além de `transform` e `opacity` está sendo animada ou alterada por quadro. Conferir `@keyframes sceneBeamDrift` e `sceneWindowTwinkle` em `apps/frontend/src/app/globals.css` (o teste `scene-animation.test.tsx` da tarefa 8 já trava isso) e o `animation-delay` inline das janelas, que não pode mudar por quadro.

4b. Paint por quadro: em SVG, `transform` em elementos filhos pode ser repintado a cada quadro pelo Chrome em vez de composto. Tentar, em `globals.css`, `will-change: transform` em `.pixel-scene .pixel-scene-beam` e `will-change: opacity` em `.pixel-scene .pixel-scene-window`, e repetir a medição. Se o Paint continuar por quadro, mover as camadas animadas para elementos HTML compostos (cada feixe e o conjunto de janelas num `div` absoluto com sua própria camada, o SVG estático dentro), preservando a API `PixelScene({ scene, animated, className })`, o `aria-hidden`, o `data-paused` e o teste `pixel-scene.test.tsx`; atualizar o teste de estrutura se os seletores mudarem.

- **Step 5: Run test to verify it passes**

Run: `pnpm --filter frontend e2e e2e/scene-performance.spec.ts`
Expected: PASS (três testes). Depois de qualquer mudança no passo 4, rodar também `pnpm --filter frontend test src/components/ui/pixel-scene.test.tsx src/app/scene-animation.test.tsx` (Expected: PASS).

- **Step 6: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/e2e/scene-performance.spec.ts apps/frontend/src/app/globals.css apps/frontend/src/components/ui/pixel-scene.tsx
git commit -m "test(frontend): medição de paint das cenas no Playwright"
```

## Critérios de Sucesso

- Com a cena animando por 3 segundos, o trace não tem eventos `Layout` nem `UpdateLayoutTree` e tem no máximo 5 eventos `Paint`, e há animações CSS realmente em execução durante a medição.
- Com o toggle "Pausar animações" acionado, nenhuma animação roda e o trace segue dentro dos mesmos limites (controle de pausa da tarefa 6).
- Com `prefers-reduced-motion: reduce` a cena nasce sem animação rodando (movimento reduzido da tarefa 8).
