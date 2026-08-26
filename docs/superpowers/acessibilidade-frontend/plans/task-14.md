# Task 14: `checkbox` — anel de foco duplo + borda + alvo de toque + `CheckIcon` oculto [FR-003, FR-011, FR-008, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

`apps/frontend/src/components/ui/checkbox.tsx` hoje usa `border-input` (baixo contraste) e classes de foco antigas (`focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`) em vez da utility `focus-ring-duplo` criada pela task-01. O `CheckIcon` decorativo dentro do indicador não está oculto de leitores de tela (é redundante ao `data-state` já exposto pelo Radix). O alvo clicável do checkbox é `size-4` (16×16px), abaixo do mínimo de 24×24px exigido pelo critério WCAG 2.5.8 (Target Size Minimum). Esta task corrige as 4 questões sem alterar o tamanho visual do quadrado de 16px.

## Arquivos

- Modify: `apps/frontend/src/components/ui/checkbox.tsx`
- Test: `apps/frontend/src/components/ui/checkbox.test.tsx` (novo)

### Conformidade com as Skills Padrão

- `shadcn`: `Checkbox` é uma primitiva shadcn/ui construída sobre `Checkbox` do `radix-ui` — mudanças de classes e composição devem seguir o padrão de customização shadcn (`data-slot`, `cn`, wrapper estrutural).
- `tailwindcss`: troca de `border-input` por `border-subtle` e das classes de foco por `focus-ring-duplo` (Tailwind v4 `@utility`), além do wrapper com `min-h-6 min-w-6` para o alvo de toque.
- `wcag-audit-patterns`: aplica diretamente critérios WCAG 2.2 — 1.4.11 (contraste não textual, borda), 2.4.7/2.4.11 (indicador de foco visível), 2.5.8 (tamanho de alvo mínimo) e 1.1.1/4.1.2 (ícone decorativo redundante oculto via `aria-hidden`).
- `vercel-react-best-practices`: o wrapper estrutural adicional não deve capturar `className`/`props` do consumidor — precisam continuar fluindo para o `CheckboxPrimitive.Root`, preservando a API pública do componente.
- `test-antipatterns`: o teste novo (`checkbox.test.tsx`) deve verificar comportamento observável (classes aplicadas, atributo `aria-hidden`, estrutura do wrapper) sem depender de detalhes internos do Radix ou mockar o próprio componente sob teste.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco do componente `checkbox`? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code ou teste visual configurada — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Read the design source and fidelity tools already recorded in `### Fidelidade Visual` (the plan author discovered them once, at plan time). Confirm the original design source with the user — only this needs the user and so belongs at execution — and fill any gap the plan left open (re-run tool discovery only if the field was left blank, inspecting the available skills + connected MCP tools; match by capability, never hardcode a tool). If a source URL or a fidelity tool exists, use it; otherwise build to the curated mockup at `../specs/mockups/acessibilidade-frontend-visual.md` manually. The mockup is the *norte* — reuse its decided layout, spacing, and tokens; do not re-derive them.

- **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Checkbox } from "./checkbox"

describe("Checkbox", () => {
	test("aplica anel de foco duplo e borda com contraste no checkbox", () => {
		render(<Checkbox aria-label="Aceitar termos" />)
		const checkbox = screen.getByRole("checkbox")
		expect(checkbox).toHaveClass("focus-ring-duplo")
		expect(checkbox).toHaveClass("border-subtle")
	})

	test("oculta o ícone de check decorativo de leitores de tela quando marcado", () => {
		const { container } = render(
			<Checkbox aria-label="Aceitar termos" defaultChecked />,
		)
		const icon = container.querySelector("svg")
		expect(icon).toHaveAttribute("aria-hidden", "true")
	})

	test("garante alvo de toque mínimo de 24x24px ao redor do checkbox", () => {
		render(<Checkbox aria-label="Aceitar termos" />)
		const wrapper = screen.getByRole("checkbox").parentElement
		expect(wrapper).toHaveClass("min-h-6")
		expect(wrapper).toHaveClass("min-w-6")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/checkbox.test.tsx`
Expected: FAIL — `focus-ring-duplo`/`border-subtle` ausentes, `aria-hidden` ausente no `svg`, `wrapper` (parent do checkbox) sem `min-h-6`/`min-w-6` (o `parentElement` hoje é o `form`/container de teste, não um wrapper dedicado).

- **Step 3: Write minimal implementation**

```tsx
"use client"

import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import type * as React from "react"

import { cn } from "@/lib/cn"

function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<span className="inline-flex min-h-6 min-w-6 items-center justify-center">
			<CheckboxPrimitive.Root
				data-slot="checkbox"
				className={cn(
					"peer size-4 shrink-0 rounded-[4px] border border-subtle shadow-xs transition-shadow focus-ring-duplo disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary",
					className,
				)}
				{...props}
			>
				<CheckboxPrimitive.Indicator
					data-slot="checkbox-indicator"
					className="grid place-content-center text-current transition-none"
				>
					<CheckIcon className="size-3.5" aria-hidden="true" />
				</CheckboxPrimitive.Indicator>
			</CheckboxPrimitive.Root>
		</span>
	)
}

export { Checkbox }
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/checkbox.test.tsx`
Expected: PASS (3 testes)

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator
  commits at the integration barrier. If your prompt says you are one of several
  implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/components/ui/checkbox.tsx apps/frontend/src/components/ui/checkbox.test.tsx
git commit -m "fix(a11y): anel de foco duplo, borda e alvo de toque no checkbox"
```

## Critérios de Sucesso

- O `checkbox` renderizado tem a classe `focus-ring-duplo` em vez das classes antigas `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` (FR-003).
- O `checkbox` renderizado tem a classe `border-subtle` em vez de `border-input` (FR-011).
- O `svg` do `CheckIcon` dentro do indicador tem `aria-hidden="true"` (FR-007).
- O elemento pai imediato do `checkbox` (`role="checkbox"`) tem `min-h-6` e `min-w-6`, garantindo alvo de toque ≥24×24px sem alterar o tamanho visual do quadrado de 16px (FR-008).
- `className`/demais props passadas pelo consumidor continuam sendo aplicadas ao `CheckboxPrimitive.Root` (o wrapper `span` não intercepta props).
