# Task 1: Componente Tooltip (hand-built sobre radix-ui)

**Status:** IN_PROGRESS
**PRD:** ../prd/prd-admin-semantic-icons.md
**Spec:** ../specs/admin-semantic-icons-design.md
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Criar o componente `Tooltip` (compound component) hand-built sobre o pacote unificado `radix-ui`, seguindo o padrão de composição já usado em `checkbox.tsx`/`collapsible.tsx`/`sheet.tsx` (import de `{ X as XPrimitive } from "radix-ui"`) e a estrutura de `forwardRef`+`cn()` de `dropdown-menu.tsx`. É a primeira vez que Tooltip é usado no projeto; nenhuma feature consome este componente ainda (será consumido pelas tasks 6, 7 e 8). Este é o decisão arquitetural D1 da spec — sem FR numerado.

## Arquivos

- Create: `apps/frontend/src/components/ui/tooltip.tsx`
- Test: `apps/frontend/src/components/ui/tooltip.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: componente novo hand-built sobre primitivas Radix, seguindo o padrão de composição usado no restante de `components/ui/`.
- `vercel-composition-patterns`: Tooltip é um compound component (`Tooltip`/`TooltipTrigger`/`TooltipContent`/`TooltipProvider`) — a task precisa manter a composição correta em vez de props booleanas.
- `tailwindcss`: classes utilitárias do `TooltipContent` (Tailwind v4, tokens do tema já existentes).
- `typescript-advanced`: tipagem via `ComponentPropsWithoutRef`/`ElementRef` do Radix, `forwardRef` genérico.
- `test-antipatterns`: testar o comportamento real do Radix Tooltip (hover/foco) sem mockar a biblioteca; evitar testes acoplados a detalhes internos do Radix.

## Passos

- **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip"

function renderTooltip() {
	return render(
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>Ação</TooltipTrigger>
				<TooltipContent>Conteúdo do tooltip</TooltipContent>
			</Tooltip>
		</TooltipProvider>,
	)
}

describe("Tooltip", () => {
	test("exibe o conteúdo ao passar o mouse (hover) sobre o trigger", async () => {
		const user = userEvent.setup()
		renderTooltip()
		await user.hover(screen.getByText("Ação"))
		expect(
			await screen.findByText("Conteúdo do tooltip"),
		).toBeInTheDocument()
	})

	test("exibe o conteúdo ao focar o trigger via teclado", async () => {
		const user = userEvent.setup()
		renderTooltip()
		await user.tab()
		expect(screen.getByText("Ação")).toHaveFocus()
		expect(
			await screen.findByText("Conteúdo do tooltip"),
		).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/tooltip.test.tsx`
Expected: FAIL — `Failed to resolve import "./tooltip"` (arquivo `tooltip.tsx` ainda não existe).

- **Step 3: Write minimal implementation**

```tsx
"use client"

import { Tooltip as TooltipPrimitive } from "radix-ui"
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from "react"
import { cn } from "@/lib/cn"

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = forwardRef<
	ElementRef<typeof TooltipPrimitive.Content>,
	ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
	<TooltipPrimitive.Portal>
		<TooltipPrimitive.Content
			ref={ref}
			sideOffset={sideOffset}
			className={cn(
				"z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md",
				className,
			)}
			{...props}
		/>
	</TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/tooltip.test.tsx`
Expected: PASS (2 testes)

- **Step 5: Commit** *(sequencial — esta task roda sozinha na Wave 1 junto da task 2, mas em arquivos distintos; se seu prompt de execução indicar que você é um dos implementadores de uma wave paralela em árvore compartilhada, pule este passo e apenas reporte os arquivos criados/alterados.)*

```bash
git add apps/frontend/src/components/ui/tooltip.tsx apps/frontend/src/components/ui/tooltip.test.tsx
git commit -m "feat: adiciona componente Tooltip hand-built sobre radix-ui"
```

## Critérios de Sucesso

- `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` são exportados nomeadamente de `apps/frontend/src/components/ui/tooltip.tsx`.
- `TooltipContent` fica visível tanto no hover do mouse quanto no foco de teclado do `TooltipTrigger`, sem exigir Provider fora do escopo do teste (Radix lança erro sem `TooltipProvider` — o teste cobre isso implicitamente ao envolver com ele).
- Nenhuma dependência nova instalada (`radix-ui` já traz `Tooltip` embutido).
