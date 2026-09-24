# Task 3: BrandMark em pixel e sidebar escura nos dois temas [FR-003]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Redesenha o ícone do `BrandMark` como um raio em pixel (SVG de retângulos com coordenadas inteiras e `shape-rendering="crispEdges"`), mantendo a interface e o texto "VOLT". No shell autenticado, a barra lateral passa a usar só os tokens `sidebar-*` (inclusive o texto da marca), garantindo a barra escura nos dois temas.

## Arquivos

- Modify: `apps/frontend/src/components/ui/brand-mark.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/components/ui/brand-mark.test.tsx`
- Test: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`

## Interfaces

- **Consome:** tokens `--color-sidebar`, `--color-sidebar-foreground`, `--color-sidebar-border`, `--color-accent`, `--color-accent-foreground` de `apps/frontend/src/app/globals.css` (task-01), usados pelas classes `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`, `bg-accent`, `text-accent-foreground`.
- **Produz:** `BrandMark` com a mesma assinatura pública (`BrandMarkProps { wordmark?: boolean; className?: string }`, `function BrandMark({ wordmark = true, className }: BrandMarkProps)`), ícone SVG pixel `aria-hidden`.

### Conformidade com as Skills Padrão

- `tailwindcss`: classes de token (`bg-sidebar`, `text-sidebar-foreground`), nenhuma cor literal.
- `shadcn`: mantém o padrão de componente pequeno com `cn` de `@/lib/cn`.
- `test-antipatterns`: testes assertam estrutura observável (atributos do SVG, classes de token), não detalhes de implementação.
- `no-workarounds`: sidebar escura vem dos tokens, sem `dark:` extra.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-visual-redesign-visual.md` (sidebar `#0b1626` escura nos dois temas; raio em pixel)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para a marca? A spec registra "nenhuma".
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma além do `playwright-cli` para conferir no navegador; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** nome VOLT mantido; ícone pixel numa grade 8x8 escalada por fator inteiro (`h-4 w-4` = 2x); caixa do ícone `h-8 w-8 rounded-md bg-accent` (ciano)

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual`. Sem fonte de design nem ferramenta de design-to-code: construir contra o mockup e conferir com `playwright-cli` no fim do lote.

- **Step 1: Write the failing test**

Substituir `apps/frontend/src/components/ui/brand-mark.test.tsx` por:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { BrandMark } from "./brand-mark"

describe("BrandMark", () => {
	test("exibe o wordmark VOLT", () => {
		render(<BrandMark />)
		expect(screen.getByText("VOLT")).toBeInTheDocument()
	})
	test("renderiza o ícone de raio (svg)", () => {
		const { container } = render(<BrandMark />)
		expect(container.querySelector("svg")).toBeInTheDocument()
	})
	test("oculta o wordmark quando wordmark=false", () => {
		render(<BrandMark wordmark={false} />)
		expect(screen.queryByText("VOLT")).not.toBeInTheDocument()
	})
	test("o ícone é decorativo e desenhado em pixel com bordas nítidas", () => {
		const { container } = render(<BrandMark />)
		const svg = container.querySelector("svg")
		expect(svg).toHaveAttribute("aria-hidden", "true")
		expect(svg).toHaveAttribute("shape-rendering", "crispEdges")
		expect(svg).toHaveAttribute("viewBox", "0 0 8 8")
	})
	test("o ícone usa apenas retângulos de coordenadas inteiras", () => {
		const { container } = render(<BrandMark />)
		const rects = Array.from(container.querySelectorAll("svg rect"))
		expect(rects.length).toBeGreaterThanOrEqual(5)
		for (const rect of rects) {
			for (const attribute of ["x", "y", "width", "height"]) {
				const value = Number(rect.getAttribute(attribute))
				expect(Number.isInteger(value), `${attribute}=${value}`).toBe(true)
			}
		}
	})
})
```

Acrescentar ao final de `apps/frontend/src/components/layout/authenticated-shell.test.tsx` (usa os helpers e imports já existentes no arquivo):

```tsx
describe("AuthenticatedShell — sidebar escura por tokens", () => {
	test("a barra lateral usa só tokens sidebar-* nos dois temas", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const aside = screen.getByRole("complementary")
		expect(aside).toHaveClass(
			"bg-sidebar",
			"text-sidebar-foreground",
			"border-sidebar-border",
		)
	})

	test("o texto da marca na barra lateral usa o token de texto da sidebar", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const aside = screen.getByRole("complementary")
		const mark = aside.querySelector("a[href='/inicio'] > span")
		expect(mark).toHaveClass("text-sidebar-foreground")
		expect(mark).not.toHaveClass("text-white")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/components/ui/brand-mark.test.tsx src/components/layout/authenticated-shell.test.tsx`
Expected: FAIL. `o ícone é decorativo...` falha porque `shape-rendering` é `null` (o ícone atual é o `Zap` do lucide), `o ícone usa apenas retângulos...` falha em `expected 0 to be greater than or equal to 5`, e `o texto da marca...` falha porque a marca tem `text-white`.

- **Step 3: Write minimal implementation**

Substituir `apps/frontend/src/components/ui/brand-mark.tsx` por:

```tsx
import { cn } from "@/lib/cn"

export interface BrandMarkProps {
	/** Exibe o texto "VOLT" ao lado do ícone. Default: true. */
	wordmark?: boolean
	className?: string
}

// Raio em pixel numa grade 8x8: [x, y, largura, altura], todos inteiros.
const BOLT_RECTS: ReadonlyArray<readonly [number, number, number, number]> = [
	[4, 0, 3, 1],
	[3, 1, 3, 1],
	[2, 2, 3, 1],
	[1, 3, 6, 1],
	[3, 4, 3, 1],
	[2, 5, 2, 1],
	[2, 6, 1, 1],
]

function PixelBolt() {
	return (
		<svg
			viewBox="0 0 8 8"
			shapeRendering="crispEdges"
			aria-hidden="true"
			focusable="false"
			className="h-4 w-4"
			fill="currentColor"
		>
			{BOLT_RECTS.map(([x, y, width, height]) => (
				<rect
					key={`${x}-${y}`}
					x={x}
					y={y}
					width={width}
					height={height}
				/>
			))}
		</svg>
	)
}

export function BrandMark({ wordmark = true, className }: BrandMarkProps) {
	return (
		<span className={cn("inline-flex items-center gap-3", className)}>
			<span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
				<PixelBolt />
			</span>
			{wordmark && (
				<span className="font-display text-xl font-bold tracking-wide">
					VOLT
				</span>
			)}
		</span>
	)
}
```

Em `apps/frontend/src/components/layout/authenticated-shell.tsx`, trocar `"text-white max-[860px]:[&>span:last-child]:hidden"` por `"text-sidebar-foreground max-[860px]:[&>span:last-child]:hidden"` na chamada `<BrandMark wordmark className={cn(...)} />` da barra lateral. Nenhuma outra linha do shell muda (o `<aside>` já usa `bg-sidebar`, `border-sidebar-border` e `text-sidebar-foreground`).

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/components/ui/brand-mark.test.tsx src/components/layout/authenticated-shell.test.tsx src/components/layout/public-shell.test.tsx`
Expected: PASS

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/components/ui/brand-mark.tsx apps/frontend/src/components/ui/brand-mark.test.tsx apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(frontend): BrandMark em pixel e sidebar por tokens"
```

## Critérios de Sucesso

- O `BrandMark` exibe o nome VOLT e um ícone SVG pixel com retângulos de coordenadas inteiras, `shape-rendering="crispEdges"` e `aria-hidden` (FR-003).
- A interface `BrandMarkProps` e o comportamento `wordmark={false}` não mudaram.
- A barra lateral do shell autenticado usa apenas tokens `sidebar-*`, escura nos dois temas (FR-003).
