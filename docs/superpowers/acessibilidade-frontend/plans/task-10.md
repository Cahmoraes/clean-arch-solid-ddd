# Task 10: `authenticated-shell` — skip-link para o conteúdo principal [FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`AuthenticatedShell` (`apps/frontend/src/components/layout/authenticated-shell.tsx`) não oferece um skip-link — usuários de teclado/leitor de tela precisam tabular por toda a sidebar (logo, toggle recolher/expandir, itens de navegação principal, itens de admin quando aplicável, botão Sair) antes de chegar ao conteúdo principal da rota. A task adiciona o mesmo padrão de skip-link de `public-shell.tsx` (Task 9) como primeiro filho da raiz do shell, com `focus:z-50` para garantir que o link fique acima do header sticky (`z-30`, L290) quando focado, e um `id="main-content"` no `<main>` como alvo.

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: o skip-link usa exclusivamente utilities Tailwind v4 (`sr-only`, `focus:not-sr-only`, `focus:absolute`, `focus:z-50`, tokens `bg-accent`/`text-accent-foreground` já existentes no tema) — nenhum CSS customizado novo. `focus:z-50` é necessário para sobrepor o header sticky que usa `z-30`.
- `wcag-audit-patterns`: skip-link é o mecanismo padrão do critério 2.4.1 (Bypass Blocks) para pular blocos de conteúdo repetidos (sidebar de navegação) antes do conteúdo principal — especialmente relevante aqui, pois a sidebar autenticada tem mais itens focáveis que o header público.
- `vercel-react-best-practices`: a mudança é markup estático inserido em um componente client já existente (`"use client"`), sem novo estado/efeito — não deve introduzir lógica adicional além do link e do `id`.
- `vercel-composition-patterns`: o link é inserido como filho direto do componente-raiz (`AuthenticatedShell`) sem alterar a assinatura de `AuthenticatedShellProps` (`children`/`className`/`defaultCollapsed`) nem exigir prop nova do consumidor.
- `test-antipatterns`: o teste verifica o contrato observável (role `link`, nome acessível, `href`, existência do alvo `#main-content`) via Testing Library, reutilizando os mocks/helpers (`renderWithProviders`, `setRole`) já estabelecidos no arquivo de teste, sem introduzir mocks redundantes.

## Passos

- **Step 1: Write the failing test**

Adicionar o `describe` abaixo em `apps/frontend/src/components/layout/authenticated-shell.test.tsx`, reutilizando `renderWithProviders`, `screen` e o helper `setRole` já importados/definidos no topo do arquivo:

```tsx
describe("AuthenticatedShell — skip-link", () => {
	test("exibe skip-link para o conteúdo principal", () => {
		setRole("MEMBER")
		const { container } = renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const skipLink = screen.getByRole("link", {
			name: "Pular para o conteúdo principal",
		})
		expect(skipLink).toHaveAttribute("href", "#main-content")
		expect(container.querySelector("#main-content")).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run (a partir da raiz do monorepo): `pnpm --filter frontend exec vitest run src/components/layout/authenticated-shell.test.tsx`
Expected: FAIL — `screen.getByRole("link", { name: "Pular para o conteúdo principal" })` lança `TestingLibraryElementError` porque nenhum elemento com esse papel/nome existe ainda.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/components/layout/authenticated-shell.tsx`, inserir como primeiro filho da `<div data-testid="authenticated-shell">` (antes do `<aside>`):

```tsx
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground"
			>
				Pular para o conteúdo principal
			</a>
```

E trocar a linha do `<main>` existente:

```tsx
				<main id="main-content" className="flex-1 overflow-y-auto">
```

(substitui `<main className="flex-1 overflow-y-auto">`, por volta de L319)

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/layout/authenticated-shell.test.tsx`
Expected: PASS — todos os testes do arquivo (os 12 já existentes + o novo) passam.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator
  commits at the integration barrier. If your prompt says you are one of several
  implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(a11y): adiciona skip-link ao AuthenticatedShell"
```

## Critérios de Sucesso

- Existe um link com nome acessível "Pular para o conteúdo principal" como primeiro elemento focável da árvore do `AuthenticatedShell` — FR-004.
- O link aponta para `href="#main-content"` e o `<main>` do shell possui `id="main-content"` como alvo válido.
- O link fica visualmente oculto (`sr-only`) até receber foco de teclado, e ao ser focado fica acima do header sticky (`focus:z-50` > `z-30` do header).
- Os 12 testes pré-existentes em `authenticated-shell.test.tsx` continuam passando sem alteração.
