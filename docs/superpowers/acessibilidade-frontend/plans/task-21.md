# Task 21: `accessibility.spec.ts` — cobertura e2e de `/admin/usuarios` e `/assinatura` [FR-001, FR-002, FR-003, FR-004, FR-007, FR-009, FR-010, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** capable
**Depends on:** task-01, task-02, task-03, task-09, task-10, task-12, task-13, task-14, task-18

## Visão Geral

O arquivo `apps/frontend/e2e/accessibility.spec.ts` já roda uma varredura axe-core (`scan()`) contra as telas públicas (`/login`, `/cadastro`) e um conjunto de telas autenticadas de membro (`/academias`, `/perfil`, `/check-ins`). Ele não cobre nenhuma rota administrativa. Esta task adiciona um novo teste, dentro do mesmo `test.describe("Acessibilidade — telas autenticadas", ...)`, que provisiona um usuário `ADMIN`, faz login via UI e roda `scan()` contra `/admin/usuarios` e `/assinatura` — as duas rotas que exercitam, de ponta a ponta, as correções aplicadas pelas tasks 01 (tokens globais/anel de foco), 02 (`CardTitle` semântico), 03 (`PaginationLink` com `href` obrigatório e ícones `aria-hidden`), 09/10 (skip-link do shell público/autenticado), 12/13/14 (`Button`/`Input`/`Checkbox` com `focus-ring-duplo` e `border-subtle`) e 18 (`SearchBar` com nome acessível). Esta é a última task do plano (Wave 3, sequencial) e fecha a cobertura e2e de acessibilidade das rotas administrativas.

## Arquivos

- Modify: `apps/frontend/e2e/accessibility.spec.ts`

Não há arquivo de teste separado — o próprio spec listado acima É o teste (padrão Playwright e2e deste repositório, confirmado pelos 4 testes já existentes no arquivo).

### Conformidade com as Skills Padrão

- `playwright-cli`: task adiciona um `test(...)` Playwright novo (provisionamento via `request`, login via UI, varredura axe-core) — a skill orienta a automação/estrutura correta de teste Playwright.
- `wcag-audit-patterns`: o objetivo do teste é validar conformidade WCAG 2.2 (via axe-core) das rotas `/admin/usuarios` e `/assinatura`; a skill fundamenta quais violações a varredura deve capturar e por que as tasks de dependência as eliminam.
- `test-antipatterns`: task mexe em teste e2e existente — a skill evita duplicar setup desnecessário, testar comportamento de mock em vez de comportamento real, ou acoplar o teste a detalhes de implementação em vez de ao comportamento observável (varredura de acessibilidade da página renderizada).

## Passos

- **Step 1: Escrever o novo teste (cobertura ainda inexistente)**

Adicionar, dentro de `test.describe("Acessibilidade — telas autenticadas", ...)`, logo após o teste existente `"varredura em /academias, /perfil e /check-ins"`, o seguinte teste:

```ts
	test("varredura em /admin/usuarios e /assinatura", async ({
		page,
		request,
	}) => {
		const user = await provisionUser(request, { role: "ADMIN" })
		await loginViaUi(page, user)

		await scan(page, "/admin/usuarios")
		await scan(page, "/assinatura")
	})
```

O bloco completo do `describe` fica:

```ts
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

	test("varredura em /admin/usuarios e /assinatura", async ({
		page,
		request,
	}) => {
		const user = await provisionUser(request, { role: "ADMIN" })
		await loginViaUi(page, user)

		await scan(page, "/admin/usuarios")
		await scan(page, "/assinatura")
	})
})
```

- **Step 2: Rodar o spec ANTES da mudança para confirmar a lacuna de cobertura**

Run: `pnpm --filter frontend e2e -- e2e/accessibility.spec.ts`
Expected: PASS, executando exatamente os 4 testes hoje existentes no arquivo (2 telas públicas + o teste combinado de `/academias`, `/perfil`, `/check-ins`). Nenhum desses 4 testes toca `/admin/usuarios` ou `/assinatura` — a lacuna de cobertura não se manifesta como uma falha de asserção, e sim como ausência total de verificação dessas duas rotas. É essa ausência que o Step 1 elimina.

- **Step 3: Implementação mínima**

A implementação É o próprio Step 1 — adicionar o `test(...)` acima ao arquivo `apps/frontend/e2e/accessibility.spec.ts`. Não há função de produção nova a escrever: `scan()`, `provisionUser` e `loginViaUi` já existem e já suportam `role: "ADMIN"` e uma URL arbitrária.

- **Step 4: Rodar o spec DEPOIS da mudança**

Run: `pnpm --filter frontend e2e -- e2e/accessibility.spec.ts`
Expected: PASS nos 5 testes (os 4 anteriores + o novo `"varredura em /admin/usuarios e /assinatura"`) — **somente se as tasks task-01, task-02, task-03, task-09, task-10, task-12, task-13, task-14 e task-18 já foram aplicadas** ao repositório, pois são elas que corrigem as violações axe-core reais em `/admin/usuarios` e `/assinatura` (tokens de foco, `CardTitle` semântico, `PaginationLink`/ícones, skip-links dos shells, `Button`/`Input`/`Checkbox`, `SearchBar`). Caso o teste rode antes dessas dependências estarem aplicadas, o resultado esperado é FAIL, com a função `scan()` lançando um erro no formato:

```
Violações axe-core em /admin/usuarios:
- [serious] <id-da-regra>: <descrição>
  nodes: <seletor-1> | <seletor-2> | <seletor-3>
```

(ou o equivalente para `/assinatura`, se a violação estiver lá). Esse FAIL condicional é consequência esperada da natureza desta task — ela é a última do plano exatamente porque depende de fixes de UI que precisam estar aplicados primeiro — e não indica um teste mal escrito.

- **Step 5: Commit** *(nota padrão de execução paralela — mesmo esta task sendo Wave 3/sequencial, mantém-se a mesma orientação: se seu prompt indicar que você é um de vários implementadores em uma árvore compartilhada, pule este step e reporte os arquivos em vez de commitar.)*

```bash
git add apps/frontend/e2e/accessibility.spec.ts
git commit -m "test: cobre varredura axe-core de /admin/usuarios e /assinatura"
```

## Critérios de Sucesso

- `apps/frontend/e2e/accessibility.spec.ts` contém um novo `test("varredura em /admin/usuarios e /assinatura", ...)` dentro de `test.describe("Acessibilidade — telas autenticadas", ...)`, provisionando um usuário com `role: "ADMIN"`, fazendo login via `loginViaUi` e chamando `scan()` para `/admin/usuarios` e `/assinatura`.
- `pnpm --filter frontend e2e -- e2e/accessibility.spec.ts` executa exatamente 5 testes do arquivo (os 4 pré-existentes + o novo), sem afetar nenhum outro spec e2e.
- FR-001 (rótulo programático) e FR-011 (borda com contraste) verificados indiretamente em `/admin/usuarios` via correções de `input.tsx`/`checkbox.tsx` (task-13, task-14) e `search-bar.tsx` (task-18).
- FR-002 (aria-required + texto sr-only) e FR-007 (ícones decorativos com aria-hidden) verificados indiretamente em `/admin/usuarios` via correções de `pagination.tsx` (task-03) e componentes de busca/checkbox usados na listagem administrativa.
- FR-003 (contraste do anel de foco) verificado em ambas as rotas via `globals.css` (task-01) e `button.tsx`/`input.tsx`/`checkbox.tsx` (task-12, task-13, task-14).
- FR-004 (skip-link) verificado em ambas as rotas via `authenticated-shell.tsx` (task-10) e, transitivamente, `public-shell.tsx` (task-09).
- FR-009 (`CardTitle` como heading semântico) verificado em `/assinatura` via correção de `card.tsx` (task-02), consumido pelos cards de plano.
- FR-010 (`PaginationLink` com `href` obrigatório) verificado em `/admin/usuarios` via correção de `pagination.tsx` (task-03), consumido pela paginação de usuários.
- A varredura axe-core em `/admin/usuarios` e `/assinatura` só passa sem violações `critical`/`serious` quando as tasks task-01, task-02, task-03, task-09, task-10, task-12, task-13, task-14 e task-18 já foram aplicadas ao repositório — este teste é a barreira de integração final que confirma isso.
