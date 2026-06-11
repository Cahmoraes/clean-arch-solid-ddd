# Task 1: Criar componente `PageContainer` + testes unitários [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-008, RF-009]

**Status:** DONE
**PRD:** `../prd/prd-content-width-standardization.md`
**Spec:** `../specs/content-width-standardization-design.md`
**Depends on:** N/A

## Visão Geral

Criar o componente `PageContainer`, ponto único de definição de largura de página. Ele aplica a `max-w` do tier (`wide` = nenhuma, `default` = `max-w-4xl`, `narrow` = `max-w-2xl`), alinha o conteúdo à esquerda (sem `mx-auto`), padroniza o ritmo vertical (`flex flex-col gap-8`) e **não** re-aplica padding horizontal (responsabilidade do shell). É polimórfico via `as` para preservar landmarks (`<section aria-labelledby>`).

## Arquivos

- Create: `apps/frontend/src/components/layout/page-container.tsx`
- Test: `apps/frontend/src/components/layout/page-container.test.tsx`

### Conformidade com as Skills Padrão

- use skill `test-antipatterns`: testes verificam comportamento observável (classes/atributos no DOM), não implementação interna.
- use skill `tailwindcss`: classes utilitárias Tailwind v4, merge via `cn`.

## Passos

- **Step 1: Escrever o teste falho**

Criar `apps/frontend/src/components/layout/page-container.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { PageContainer } from "./page-container"

describe("PageContainer", () => {
	test("usa o tier default (max-w-4xl) quando width não é informado [RF-002, RF-008]", () => {
		render(<PageContainer>conteúdo</PageContainer>)
		const el = screen.getByTestId("page-container")
		expect(el).toHaveClass("max-w-4xl")
		expect(el.getAttribute("data-width")).toBe("default")
	})

	test("tier wide não aplica max-w [RF-007]", () => {
		render(<PageContainer width="wide">c</PageContainer>)
		const el = screen.getByTestId("page-container")
		expect(el.className).not.toMatch(/max-w-/)
		expect(el.getAttribute("data-width")).toBe("wide")
	})

	test("tier narrow aplica max-w-2xl [RF-009]", () => {
		render(<PageContainer width="narrow">c</PageContainer>)
		expect(screen.getByTestId("page-container")).toHaveClass("max-w-2xl")
	})

	test("nunca centraliza horizontalmente — sem mx-auto [RF-003]", () => {
		render(<PageContainer width="default">c</PageContainer>)
		expect(screen.getByTestId("page-container").className).not.toMatch(/mx-auto/)
	})

	test("não aplica padding horizontal px-* [RF-004]", () => {
		render(<PageContainer width="default">c</PageContainer>)
		expect(screen.getByTestId("page-container").className).not.toMatch(/(^|\s)px-/)
	})

	test("aplica ritmo vertical padronizado flex flex-col gap-8 [RF-005]", () => {
		render(<PageContainer>c</PageContainer>)
		const el = screen.getByTestId("page-container")
		expect(el).toHaveClass("flex", "flex-col", "gap-8")
	})

	test("repassa className e sobrescreve o gap padrão [RF-006]", () => {
		render(<PageContainer className="gap-6">c</PageContainer>)
		const el = screen.getByTestId("page-container")
		expect(el).toHaveClass("gap-6")
		expect(el.className).not.toMatch(/gap-8/)
	})

	test("renderiza elemento polimórfico via as e repassa aria-labelledby", () => {
		render(
			<PageContainer as="section" aria-labelledby="t" width="wide">
				c
			</PageContainer>,
		)
		const el = screen.getByTestId("page-container")
		expect(el.tagName).toBe("SECTION")
		expect(el.getAttribute("aria-labelledby")).toBe("t")
	})

	test("permite sobrescrever data-testid", () => {
		render(<PageContainer data-testid="x">c</PageContainer>)
		expect(screen.getByTestId("x")).toBeInTheDocument()
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test src/components/layout/page-container.test.tsx`
Expected: FAIL — `Failed to resolve import "./page-container"` (arquivo ainda não existe).

- **Step 3: Implementar o componente**

Criar `apps/frontend/src/components/layout/page-container.tsx`:

```tsx
import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/cn"

export type PageContainerWidth = "wide" | "default" | "narrow"

const WIDTH_CLASSES: Record<PageContainerWidth, string> = {
	wide: "",
	default: "max-w-4xl",
	narrow: "max-w-2xl",
}

export interface PageContainerProps {
	width?: PageContainerWidth
	as?: ElementType
	className?: string
	children: ReactNode
	id?: string
	"aria-label"?: string
	"aria-labelledby"?: string
	"data-testid"?: string
}

export function PageContainer({
	width = "default",
	as: Component = "div",
	className,
	children,
	"data-testid": testId = "page-container",
	...rest
}: PageContainerProps) {
	return (
		<Component
			data-testid={testId}
			data-width={width}
			className={cn(
				"flex w-full flex-col gap-8",
				WIDTH_CLASSES[width],
				className,
			)}
			{...rest}
		>
			{children}
		</Component>
	)
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test src/components/layout/page-container.test.tsx`
Expected: PASS — 9 testes passando.

- **Step 5: Rodar lint + type-check**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero issues no Biome; zero erros de tipo.

- **Step 6: Commit**

```bash
git add apps/frontend/src/components/layout/page-container.tsx apps/frontend/src/components/layout/page-container.test.tsx
git commit -m "feat(frontend): add PageContainer layout component with width tiers"
```

## Critérios de Sucesso

- `PageContainer` aceita `width` com valores `wide`/`default`/`narrow`, default `default` (RF-001, RF-002).
- Nunca aplica `mx-auto` (RF-003) nem `px-*` (RF-004); aplica `flex flex-col gap-8` por padrão (RF-005); repassa `className` (RF-006).
- `wide` sem `max-w`; `default` = `max-w-4xl`; `narrow` = `max-w-2xl` (RF-007, RF-008, RF-009).
- 9 testes unitários passando; lint + tsc limpos.
