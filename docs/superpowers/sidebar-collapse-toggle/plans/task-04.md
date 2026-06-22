# Task 4: E2E de persistência após reload [FR-005, FR-006]

**Status:** DONE
**PRD:** `../prd/prd-sidebar-collapse-toggle.md`
**Spec:** `../specs/sidebar-collapse-toggle-design.md`
**Depends on:** task-01, task-02, task-03

## Visão Geral

Teste de aceitação ponta-a-ponta (US-03): em desktop, recolher o menu, recarregar a página e confirmar que continua recolhido — validando a persistência por cookie e a ausência de flicker no carregamento de forma real (servidor → client).

## Arquivos

- Create: `apps/frontend/e2e/sidebar-collapse.spec.ts`

### Conformidade com as Skills Padrão

- `playwright-cli`: escrita do teste E2E com `@playwright/test`, seletores por role, `page.reload()`.
- `test-antipatterns`: asserir comportamento observável do usuário (rótulo do botão), não detalhes internos.

## Passos

- **Step 1: Escrever o teste E2E**

Criar `apps/frontend/e2e/sidebar-collapse.spec.ts`:

```ts
import { expect, test } from "@playwright/test"
import { loginViaUi, provisionUser } from "./helpers/auth"

test.describe("Sidebar recolhível — persistência", () => {
	test("recolher persiste após reload (FR-005, FR-006)", async ({
		page,
		request,
	}) => {
		const member = await provisionUser(request, { role: "MEMBER" })
		await loginViaUi(page, member)
		await page.goto("/inicio")

		// Aguarda o skeleton de boot (refresh transparente) sumir antes de interagir.
		await page
			.getByTestId("auth-boot-skeleton")
			.waitFor({ state: "hidden", timeout: 10_000 })
			.catch(() => undefined)

		const recolher = page.getByRole("button", { name: "Recolher menu" })
		await expect(recolher).toBeVisible({ timeout: 15_000 })
		await recolher.click()

		// Recolhido: o botão passa a oferecer "Expandir menu".
		await expect(
			page.getByRole("button", { name: "Expandir menu" }),
		).toBeVisible()

		await page.reload()
		await page
			.getByTestId("auth-boot-skeleton")
			.waitFor({ state: "hidden", timeout: 10_000 })
			.catch(() => undefined)

		// Persistência: continua recolhido após reload.
		await expect(
			page.getByRole("button", { name: "Expandir menu" }),
		).toBeVisible({ timeout: 15_000 })
	})
})
```

- **Step 2: Rodar o teste E2E**

Run: `pnpm --filter frontend e2e -- sidebar-collapse`
Expected: PASS. (O Playwright sobe backend + frontend via `webServer`. Se o ambiente local não tiver Docker/serviços, rodar contra o ambiente E2E padrão do projeto.)

- **Step 3: Commit**

```bash
git add apps/frontend/e2e/sidebar-collapse.spec.ts
git commit -m "test(sidebar): e2e de persistência do recolhimento após reload"
```

## Critérios de Sucesso

- [ ] Recolher → reload → permanece recolhido (FR-005, FR-006).
- [ ] O teste passa na suíte E2E do projeto.
