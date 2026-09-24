# Task 16: Acessibilidade axe nos dois temas no Playwright [FR-022]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-15

## Visão Geral

Hoje o `e2e/accessibility.spec.ts` escaneia só o tema padrão (escuro). Esta tarefa passa a escanear as mesmas rotas nos temas escuro e claro, trocando o tema antes da navegação, e mantém a regra de falhar em impactos `critical` e `serious`. Um guarda confirma que o tema pedido foi mesmo aplicado, para o scan não passar "de graça" no tema errado. Como o scan roda contra a aplicação real, ele valida o contraste dos tokens (tarefas 1 e 2) e das telas (tarefas 12 a 15).

## Arquivos

- Modify: `apps/frontend/e2e/accessibility.spec.ts`

## Interfaces

- **Consome:** `provisionUser(request: APIRequestContext, options: { role: Role })` e `loginViaUi(page: Page, user: TestUser)` de `apps/frontend/e2e/helpers/auth.ts` (existentes; `Role = "MEMBER" | "ADMIN"`). O `next-themes` do app guarda o tema em `localStorage` na chave `theme` (`"dark"` ou `"light"`) e aplica a classe `dark` em `<html>` (`ThemeProvider attribute="class" defaultTheme="dark"`).
- **Produz:** `e2e/accessibility.spec.ts` com `scan(page: Page, url: string, theme: Theme): Promise<void>`, `type Theme = "dark" | "light"`, `const THEMES: ReadonlyArray<Theme>` e `applyTheme(page: Page, theme: Theme): Promise<void>` internos ao arquivo; nenhum símbolo é exportado.

### Conformidade com as Skills Padrão

- `playwright-cli`: uso de `page.addInitScript` para fixar o tema antes da hidratação e de `page.locator(...).waitFor` em vez de esperas fixas.
- `wcag-audit-patterns`: axe com as tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`; falha em `critical` e `serious`, como hoje.
- `test-antipatterns`: sem mocks (`page.route`); a verificação de tema é uma asserção real sobre o DOM.
- `no-workarounds`: violação de contraste se corrige no token ou no componente, nunca desabilitando a regra `color-contrast` nem reduzindo as rotas.

## Passos

- **Step 1: Confirm the environment for the e2e run**

O spec sobe backend e frontend sozinho (`playwright.config.ts`), mas o backend precisa dos serviços de dados. Antes de rodar:

Run: `pnpm --filter backend docker:up`
Expected: PostgreSQL, Redis e RabbitMQ em execução (se já estiverem, o comando é idempotente). Sem esses serviços, o `webServer` do Playwright expira aguardando `/health-check`.

- **Step 2: Write the failing test**

Substituir `apps/frontend/e2e/accessibility.spec.ts` por (mantém os testes de foco e de zoom de texto no tema padrão e parametriza as varreduras por tema):

```ts
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
```

- **Step 3: Run test to verify it fails or exposes a violation to fix**

Run: `pnpm --filter frontend e2e e2e/accessibility.spec.ts`
Expected: os testes de foco e de zoom passam no tema padrão. Cada varredura por tema passa se o tema foi aplicado e não há impacto `critical`/`serious`; caso contrário falha com `expect(locator).toHaveClass(...)` (tema não aplicado, ver passo 4a) ou com `Violações axe-core em <url> (tema <tema>): - [serious] color-contrast ...` listando os alvos (ver passo 4b). O resultado exato só a execução revela.

- **Step 4: Write minimal implementation**

4a. Se o guarda de tema falhar, o tema não foi aplicado: confirmar a chave e o atributo reais lendo `apps/frontend/src/app/layout.tsx` (`ThemeProvider attribute="class" defaultTheme="dark"`; a chave padrão do `next-themes` é `theme`) e ajustar `applyTheme` para a chave em uso.

4b. Se uma varredura listar `color-contrast` ou outra violação `serious`, a correção é no código de produção, não no spec: ajustar o token em `apps/frontend/src/app/globals.css` (manter os pares de `contrast-tokens.test.tsx` passando) ou a classe do componente apontado em `nodes`, e rodar de novo. Não desabilitar regras do axe nem reduzir rotas ou temas.

- **Step 5: Run test to verify it passes**

Run: `pnpm --filter frontend e2e e2e/accessibility.spec.ts`
Expected: PASS (onze testes: três de foco e zoom no tema padrão e oito varreduras, quatro por tema: login, cadastro, o grupo membro e o grupo admin)

- **Step 6: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/e2e/accessibility.spec.ts
git commit -m "test(frontend): axe nos temas escuro e claro no Playwright"
```

## Critérios de Sucesso

- As rotas `/login`, `/cadastro`, `/academias`, `/perfil`, `/check-ins`, `/admin/usuarios` e `/assinatura` são escaneadas com axe nos temas escuro e claro (FR-022).
- O scan falha se o tema pedido não estiver aplicado e continua falhando em impacto `critical` e `serious`.
- Os testes de foco visível e de escala de fonte seguem intactos no tema padrão.
