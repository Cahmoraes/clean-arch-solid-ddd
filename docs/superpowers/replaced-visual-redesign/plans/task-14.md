# Task 14: Tela de Academias na direção Noite neon [FR-019]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-01, task-04, task-11, task-13

## Visão Geral

Reestiliza a tela de Academias na direção aprovada: card com hover em elevação e anel ciano por token, linha da lista com realce de hover, botão de editar do admin com hover em ciano, badges Disponível (verde) e Desativada (vermelho), pílula "Check-in" em ciano, "+ Cadastrar" em magenta e paginação com página ativa em ciano. A maior parte do visual já vem dos tokens, do `SegmentedControl` (tarefa 12), da paginação (tarefa 13), do glow de hover (tarefa 4) e da capa com cena (tarefa 11); esta tarefa fecha o que falta no card e na linha e trava o contrato com testes. Cadastrar, editar (admin), busca, alternador cards/lista e paginação continuam funcionando.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-row.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-card.test.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-row.test.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-results.test.tsx`

## Interfaces

- **Consome:**
  - De task-01: tokens `--color-accent`, `--color-primary`, `--shadow-glow` (utilitários `hover:shadow-glow`, `bg-accent`, `text-accent-foreground`, `hover:text-accent`, `hover:bg-surface-2`).
  - De task-04: `GymCard` com `motion.div[data-testid="gym-card-wrapper"]` que já tem `hover:shadow-glow` (variants `rest: { y: 0, scale: 1 }`, `hover: { y: -3, scale: 1.015 }`).
  - De task-11: `GymImage` com `sceneAnimated?: boolean` e `GymCard` já passando `sceneAnimated`.
  - De task-13: `NumberedPagination` com página ativa `border-accent bg-accent/10` (usada por `GymPagination`).
  - Já existentes, sem mudar: `GymCardProps { gym: GymSummary; adminEditHref?: string }`, `GymRowProps { gym: GymSummary; adminEditHref?: string }`, `GymResultsProps`, `resolveGymStatusBadge(gym, adminEditHref)` (Disponível verde; Desativada vermelho só para admin com `status === "deactivated"`), `StatusBadge`.
- **Produz:** N/A (nenhuma assinatura nova; contrato visual por classes de token).

### Conformidade com as Skills Padrão

- `shadcn`: `StatusBadge` e `Button` intactos; mudanças por classes de token.
- `tailwindcss`: hover por token (`hover:text-accent`, `hover:bg-surface-2`), sem `rgba` ou hex.
- `vercel-composition-patterns`: nenhuma prop nova; `GymResults` continua escolhendo card ou linha.
- `wcag-audit-patterns`: links com nome acessível ("Editar academia ..."), realce de hover com contraste, foco visível herdado do anel duplo global.
- `test-antipatterns`: asserções por texto visível e por classes de token; nada de espiar o `motion`.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-visual-redesign-academias-visual.md` (tokens em `replaced-visual-redesign-visual.md`)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para a tela de Academias? A spec registra "nenhuma".
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma além do `playwright-cli` para conferir no navegador; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** cabeçalho com eyebrow "Rede", título "Academias" e "+ Cadastrar" (admin) em magenta; linha de busca com botão "Buscar" e alternador cards/lista à direita; grade `auto-fill minmax(280px, 1fr)` com gap de 18px; card com capa de 140px, badge de status no canto superior esquerdo, editar (admin) no superior direito, título em Space Grotesk e pílula "Check-in" em ciano; badges Disponível verde e Desativada vermelho; hover do card com elevação e anel ciano; skyline só como fallback de capa

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual`. Sem fonte de design nem ferramenta de design-to-code: construir contra o mockup e conferir com `playwright-cli` no fim do lote (`/academias` como membro e como admin, cards e lista, tema escuro e claro).

- **Step 1: Write the failing test**

Acrescentar dentro do `describe("GymCard VOLT", ...)` de `apps/frontend/src/features/gyms/components/gym-card.test.tsx`:

```tsx
	test("a pílula Check-in usa o acento (ciano) e o hover vem do token de glow", () => {
		renderWithProviders(<GymCard gym={gym} />)
		expect(screen.getByText("Check-in")).toHaveClass(
			"bg-accent",
			"text-accent-foreground",
		)
		expect(screen.getByTestId("gym-card-wrapper")).toHaveClass("hover:shadow-glow")
	})

	test("o badge é verde (Disponível) e, para admin, vermelho (Desativada)", () => {
		const { rerender } = renderWithProviders(<GymCard gym={gym} />)
		expect(screen.getByText("Disponível")).toHaveClass("bg-success-soft", "text-success")
		rerender(
			<GymCard
				gym={{ ...gym, status: "deactivated" }}
				adminEditHref="/admin/academias/g1/editar"
			/>,
		)
		expect(screen.getByText("Desativada")).toHaveClass(
			"bg-destructive-soft",
			"text-destructive",
		)
	})

	test("o botão de editar do admin destaca em ciano no hover, não em magenta", () => {
		renderWithProviders(
			<GymCard gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		const edit = screen.getByTestId("gym-edit-g1")
		expect(edit).toHaveClass("hover:text-accent")
		expect(edit).not.toHaveClass("hover:text-primary")
	})
```

Acrescentar dentro do `describe("GymRow VOLT", ...)` de `apps/frontend/src/features/gyms/components/gym-row.test.tsx`:

```tsx
	test("a linha realça no hover por token e a pílula Check-in é ciano", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByTestId("gym-row-g1")).toHaveClass("hover:bg-surface-2")
		expect(screen.getByText("Check-in")).toHaveClass(
			"bg-accent",
			"text-accent-foreground",
		)
	})

	test("o botão de editar do admin destaca em ciano no hover", () => {
		renderWithProviders(
			<GymRow gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		const edit = screen.getByTestId("gym-row-edit-g1")
		expect(edit).toHaveClass("hover:text-accent")
		expect(edit).not.toHaveClass("hover:text-primary")
	})
```

Acrescentar ao `describe("GymResults", ...)` de `apps/frontend/src/features/gyms/components/gym-results.test.tsx`:

```tsx
	test("na visão de cards, cada academia é um cartão com badge verde de status", () => {
		renderWithProviders(<GymResults {...baseProps()} />)
		expect(screen.getAllByText("Disponível")).toHaveLength(2)
		expect(screen.getByTestId("gym-card-g1")).toBeInTheDocument()
	})
```

Criar `apps/frontend/src/features/gyms/components/gym-pagination.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { GymPagination } from "./gym-pagination"

describe("GymPagination", () => {
	test("a página ativa tem contorno e fundo suave em ciano", () => {
		render(<GymPagination page={2} totalPages={4} onChange={vi.fn()} />)
		expect(screen.getByTestId("gym-pagination-page-2")).toHaveClass(
			"border-accent",
			"bg-accent/10",
		)
		expect(screen.getByTestId("gym-pagination-page-1")).not.toHaveClass(
			"border-accent",
		)
	})
})
```

Nota: `gym-results.test.tsx` já usa `useGymViewStore`; se o estado inicial da visão for `rows` em algum teste anterior, o `beforeEach` do arquivo (que restaura `cards`) já cobre; se não cobrir, chamar `useGymViewStore.getState().setView("cards")` no início do teste novo.

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/features/gyms/components/gym-card.test.tsx src/features/gyms/components/gym-row.test.tsx src/features/gyms/components/gym-results.test.tsx src/features/gyms/components/gym-pagination.test.tsx`
Expected: FAIL. O botão de editar falha (`hover:text-accent` ausente; hoje `hover:text-primary`) no card e na linha; a linha falha por `hover:bg-surface-2` ausente. Os testes de pílula, badge, glow, resultados e paginação passam (já entregues pelas tarefas 1, 4, 11 e 13).

- **Step 3: Write minimal implementation**

3a. `apps/frontend/src/features/gyms/components/gym-card.tsx`: no `<Link ... data-testid={`gym-edit-${gym.id}`}>` trocar `hover:text-primary` por `hover:text-accent` na classe.

3b. `apps/frontend/src/features/gyms/components/gym-row.tsx`:

- no `<Link ... data-testid={`gym-row-${gym.id}`}>`, trocar o `className` por:

```tsx
				className={`flex w-full items-center gap-[14px] bg-card px-4 py-3 transition-colors hover:bg-surface-2 ${adminEditHref ? "pr-14" : ""}`}
```

- no `<Link ... data-testid={`gym-row-edit-${gym.id}`}>` trocar `hover:text-primary` por `hover:text-accent`.

O botão "+ Cadastrar" (`Button variant="primary"` em `app/(authenticated)/academias/page.tsx`) já é magenta pelo token `--color-primary` da tarefa 1; nenhuma mudança de código.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/features/gyms/components/gym-card.test.tsx src/features/gyms/components/gym-row.test.tsx src/features/gyms/components/gym-results.test.tsx src/features/gyms/components/gym-pagination.test.tsx "src/app/(authenticated)/academias/page.test.tsx"`
Expected: PASS

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/features/gyms/components/gym-card.tsx apps/frontend/src/features/gyms/components/gym-card.test.tsx apps/frontend/src/features/gyms/components/gym-row.tsx apps/frontend/src/features/gyms/components/gym-row.test.tsx apps/frontend/src/features/gyms/components/gym-results.test.tsx apps/frontend/src/features/gyms/components/gym-pagination.test.tsx
git commit -m "feat(frontend): tela de Academias na direção Noite neon"
```

## Critérios de Sucesso

- Busca, alternador cards/lista, cards com badge de status, cadastrar e editar (admin) e paginação continuam funcionando (FR-019).
- Hover do card com anel ciano por token (`hover:shadow-glow`), sem `rgba` literal; hover da linha por `hover:bg-surface-2`; editar do admin em ciano no hover (FR-019).
- Badge Disponível verde e Desativada vermelho (semântica preservada); pílula Check-in em ciano; página ativa da paginação em ciano (FR-019).
