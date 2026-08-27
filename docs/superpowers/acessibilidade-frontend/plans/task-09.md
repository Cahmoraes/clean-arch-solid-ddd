# Task 9: `public-shell` — skip-link para o conteúdo principal [FR-004]

**Status:** DONE
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`PublicShell` (`apps/frontend/src/components/layout/public-shell.tsx`) não oferece um skip-link — usuários de teclado/leitor de tela que navegam pelas páginas públicas (login, cadastro, clima) precisam tabular por todo o `<header>` (logo, navegação, 3 links de CTA) antes de chegar ao conteúdo principal. A task adiciona um link "Pular para o conteúdo principal", visualmente oculto até receber foco (`sr-only` → `focus:not-sr-only`), como primeiro filho da raiz do shell, e um `id="main-content"` no `<main>` como alvo do link.

## Arquivos

- Modify: `apps/frontend/src/components/layout/public-shell.tsx`
- Test: `apps/frontend/src/components/layout/public-shell.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: o skip-link usa exclusivamente utilities Tailwind v4 (`sr-only`, `focus:not-sr-only`, `focus:absolute`, `focus:z-50`, tokens `bg-accent`/`text-accent-foreground` já existentes no tema) — nenhum CSS customizado novo.
- `wcag-audit-patterns`: skip-link é o mecanismo padrão do critério 2.4.1 (Bypass Blocks) para pular blocos de conteúdo repetidos (header/nav) antes do conteúdo principal.
- `vercel-react-best-practices`: a mudança é markup estático server-renderizável, sem estado ou efeito novo — deve permanecer assim, sem introduzir client-only logic desnecessária.
- `vercel-composition-patterns`: o link é inserido como filho direto do componente-raiz (`PublicShell`) sem alterar a assinatura de `PublicShellProps` nem exigir prop nova do consumidor — mantém a API de composição existente (`children`/`className`).
- `test-antipatterns`: o teste verifica o contrato observável (role `link`, nome acessível, `href`, existência do alvo `#main-content`) via Testing Library, sem inspecionar classes de implementação do `sr-only`.

## Passos

- **Step 1: Write the failing test**

Adicionar o teste abaixo dentro do `describe("PublicShell", () => { ... })` já existente em `apps/frontend/src/components/layout/public-shell.test.tsx`:

```tsx
test("exibe skip-link para o conteúdo principal", () => {
	const { container } = render(
		<PublicShell>
			<p>conteúdo</p>
		</PublicShell>,
	)
	const skipLink = screen.getByRole("link", {
		name: "Pular para o conteúdo principal",
	})
	expect(skipLink).toHaveAttribute("href", "#main-content")
	expect(container.querySelector("#main-content")).toBeInTheDocument()
})
```

- **Step 2: Run test to verify it fails**

Run (a partir da raiz do monorepo): `pnpm --filter frontend exec vitest run src/components/layout/public-shell.test.tsx`
Expected: FAIL — `screen.getByRole("link", { name: "Pular para o conteúdo principal" })` lança `TestingLibraryElementError` porque nenhum elemento com esse papel/nome existe ainda.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/components/layout/public-shell.tsx`, inserir como primeiro filho da `<div data-testid="public-shell">` (antes do `<header>`):

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
			<main id="main-content" className="flex-1">{children}</main>
```

(substitui `<main className="flex-1">{children}</main>`, por volta de L50)

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/layout/public-shell.test.tsx`
Expected: PASS — todos os testes do arquivo (os 5 já existentes + o novo) passam.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator
  commits at the integration barrier. If your prompt says you are one of several
  implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/components/layout/public-shell.tsx apps/frontend/src/components/layout/public-shell.test.tsx
git commit -m "feat(a11y): adiciona skip-link ao PublicShell"
```

## Critérios de Sucesso

- Existe um link com nome acessível "Pular para o conteúdo principal" como primeiro elemento focável da árvore do `PublicShell` — FR-004.
- O link aponta para `href="#main-content"` e o `<main>` do shell possui `id="main-content"` como alvo válido.
- O link fica visualmente oculto (`sr-only`) até receber foco de teclado, quando se torna visível (`focus:not-sr-only`).
- Os 5 testes pré-existentes em `public-shell.test.tsx` continuam passando sem alteração.
