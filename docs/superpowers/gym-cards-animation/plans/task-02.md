# Task 02: Criar GymCardSkeleton e shimmer CSS [FR-010, FR-011, FR-012, FR-013]

**Status:** PENDING
**PRD:** `../prd/prd-gym-cards-animation.md`
**Spec:** `../specs/gym-cards-animation-design.md`
**Depends on:** N/A

## Visão Geral

Cria o componente `GymCardSkeleton` que espelha o layout visual do `GymCard` real (bloco de imagem 140px + corpo com blocos de texto), com animação shimmer via CSS puro (sem motion/react). Adiciona `@keyframes shimmer` e a classe `.shimmer` ao `globals.css`. Escreve testes para o skeleton.

Este task é independente do task-01 — não importa `motion/react`.

## Arquivos

- Create: `apps/frontend/src/features/gyms/components/gym-card-skeleton.tsx`
- Create: `apps/frontend/src/features/gyms/components/gym-card-skeleton.test.tsx`
- Modify: `apps/frontend/src/app/globals.css`

### Conformidade com as Skills Padrão

- code-style: tabs, aspas duplas, sem importações desnecessárias
- no-workarounds: shimmer é CSS puro com variáveis de tema, não cores hardcoded

## Passos

### Step 1: Escrever o teste para GymCardSkeleton (TDD — vai falhar)

Criar `apps/frontend/src/features/gyms/components/gym-card-skeleton.test.tsx`:

```tsx
import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { renderWithProviders } from "@/test/render"
import { GymCardSkeleton } from "./gym-card-skeleton"

describe("GymCardSkeleton", () => {
	test("renderiza o skeleton com data-testid correto", () => {
		renderWithProviders(<GymCardSkeleton />)
		expect(screen.getByTestId("gym-card-skeleton")).toBeInTheDocument()
	})

	test("contém o bloco de imagem placeholder de 140px de altura", () => {
		renderWithProviders(<GymCardSkeleton />)
		const imageBlock = screen
			.getByTestId("gym-card-skeleton")
			.querySelector("[data-testid='gym-card-skeleton-image']")
		expect(imageBlock).toBeInTheDocument()
		expect(imageBlock?.className).toContain("h-[140px]")
	})

	test("contém bloco de título placeholder no corpo do skeleton", () => {
		renderWithProviders(<GymCardSkeleton />)
		expect(
			screen.getByTestId("gym-card-skeleton-title"),
		).toBeInTheDocument()
	})

	test("todos os blocos shimmer possuem a classe shimmer", () => {
		renderWithProviders(<GymCardSkeleton />)
		const skeleton = screen.getByTestId("gym-card-skeleton")
		const shimmerBlocks = skeleton.querySelectorAll(".shimmer")
		expect(shimmerBlocks.length).toBeGreaterThanOrEqual(3)
	})
})
```

### Step 2: Rodar o teste para confirmar que falha

```bash
pnpm --filter frontend test:run -- -t "GymCardSkeleton"
```

Resultado esperado: FAIL — `Cannot find module './gym-card-skeleton'`

### Step 3: Adicionar @keyframes shimmer e .shimmer ao globals.css

Abrir `apps/frontend/src/app/globals.css` e adicionar ao final do arquivo, depois do bloco `@media (prefers-reduced-motion: no-preference)`:

```css
@keyframes shimmer {
	0% {
		background-position: -800px 0;
	}
	100% {
		background-position: 800px 0;
	}
}

.shimmer {
	background: linear-gradient(
		90deg,
		var(--color-surface-2) 25%,
		var(--color-surface-3) 50%,
		var(--color-surface-2) 75%
	);
	background-size: 1600px 100%;
	animation: shimmer 1.6s ease-in-out infinite;
}
```

> **Nota:** `--color-surface-2` e `--color-surface-3` são variáveis CSS do tema definidas no `globals.css`. O shimmer usa cores do tema para que funcione tanto no tema claro quanto no escuro automaticamente.

### Step 4: Criar o componente GymCardSkeleton

Criar `apps/frontend/src/features/gyms/components/gym-card-skeleton.tsx`:

```tsx
export function GymCardSkeleton() {
	return (
		<div
			data-testid="gym-card-skeleton"
			className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card"
		>
			<div
				data-testid="gym-card-skeleton-image"
				className="h-[140px] w-full shimmer"
			/>
			<div className="flex flex-col gap-2.5 p-[18px]">
				<div
					data-testid="gym-card-skeleton-title"
					className="h-4 w-3/4 rounded shimmer"
				/>
				<div className="h-3 w-1/2 rounded shimmer" />
				<div className="mt-2 h-3 w-full rounded shimmer" />
				<div className="mt-auto flex items-center justify-between border-t border-border pt-3.5">
					<div className="h-3 w-1/4 rounded shimmer" />
					<div className="h-7 w-20 rounded shimmer" />
				</div>
			</div>
		</div>
	)
}
```

### Step 5: Rodar os testes para confirmar que passam

```bash
pnpm --filter frontend test:run -- -t "GymCardSkeleton"
```

Resultado esperado: PASS — todos os 4 testes verdes.

### Step 6: Rodar lint e typecheck

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
```

Resultado esperado: 0 erros Biome, 0 erros TypeScript.

### Step 7: Commit

```bash
git add apps/frontend/src/features/gyms/components/gym-card-skeleton.tsx \
        apps/frontend/src/features/gyms/components/gym-card-skeleton.test.tsx \
        apps/frontend/src/app/globals.css
git commit -m "feat(frontend): criar GymCardSkeleton com shimmer CSS

- Adiciona @keyframes shimmer + .shimmer ao globals.css (usa variáveis de tema)
- Cria GymCardSkeleton que espelha layout real do GymCard (imagem 140px + corpo)
- Testes TDD: renderização, bloco imagem, título, contagem mínima de blocos shimmer

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `pnpm --filter frontend test:run -- -t "GymCardSkeleton"` passa com 4 testes verdes
- `pnpm --filter frontend biome:fix` reporta zero problemas
- `pnpm --filter frontend tsc:check` passa sem erros
- `gym-card-skeleton.tsx` exporta `GymCardSkeleton` com `data-testid="gym-card-skeleton"`
- Bloco de imagem tem classe `h-[140px]` e `shimmer` [FR-010, FR-011]
- `globals.css` tem `@keyframes shimmer` e `.shimmer` com variáveis de tema [FR-012, FR-013]
- Componente não importa `motion/react` (CSS puro) [FR-012]
