# Task 2: Button + Input — rounded-md e nova paleta

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/design-system-migration-design.md`

## Visão Geral

Trocar a geometria pill (`rounded-full`) por `rounded-md` (8px) em `Button` e `Input`. Atualizar as asserções dos testes existentes antes de alterar a implementação (TDD inverso para mudança de comportamento). Corrigir o uso de token de paleta estático `text-silver` em `Input`.

**Atenção:** `Badge` e `ThemeToggleFAB` mantêm `rounded-full` — não alterar nesta tarefa.

## Arquivos

- Modify: `apps/frontend/src/components/ui/button.test.tsx`
- Modify: `apps/frontend/src/components/ui/button.tsx`
- Modify: `apps/frontend/src/components/ui/input.tsx`

### Conformidade com as Skills Padrão

- shadcn: componentes usam `cva` + `cn` — nunca adicionar classes fixas fora do `cva`
- vitest: usar `renderWithProviders` e asserções sobre className via `toHaveClass`
- test-antipatterns: não testar detalhes de implementação de CSS — testar a presença da classe utilitária correta

## Passos

- [ ] **Step 1: Atualizar o teste do Button — asserção de rounded**

Abrir `apps/frontend/src/components/ui/button.test.tsx`. Localizar qualquer asserção que verifique `rounded-full` e trocar por `rounded-md`. Se não houver essa asserção, adicionar um teste para o caso padrão:

```typescript
import { render, screen } from "@testing-library/react"
import { describe, test, expect } from "vitest"
import { Button } from "./button"

describe("Button", () => {
  test("deve renderizar com rounded-md por padrão", () => {
    render(<Button>Clique aqui</Button>)
    const button = screen.getByRole("button", { name: "Clique aqui" })
    expect(button).toHaveClass("rounded-md")
    expect(button).not.toHaveClass("rounded-full")
  })
})
```

- [ ] **Step 2: Executar o teste para confirmar falha**

```bash
pnpm --filter frontend test -- -t "deve renderizar com rounded-md por padrão"
```

Esperado: FAIL — o componente ainda usa `rounded-full`.

- [ ] **Step 3: Atualizar button.tsx — rounded-full → rounded-md**

Substituir o conteúdo de `apps/frontend/src/components/ui/button.tsx`:

```typescript
"use client"

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { type ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/cn"

const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-2",
		"rounded-md",
		"font-medium leading-none",
		"transition-colors",
		"disabled:pointer-events-none disabled:opacity-50",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
		"[&_svg]:size-4 [&_svg]:shrink-0",
	].join(" "),
	{
		variants: {
			variant: {
				primary:
					"bg-primary text-primary-foreground border border-primary hover:bg-primary/90",
				secondary:
					"bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/80",
				outline:
					"bg-card text-card-foreground border border-border hover:bg-muted",
				ghost:
					"bg-transparent text-foreground border border-transparent hover:bg-muted",
				link: "bg-transparent text-foreground underline-offset-4 hover:underline border border-transparent px-0",
				destructive:
					"bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/90",
			},
			size: {
				sm: "h-8 px-4 text-sm",
				md: "h-10 px-6 text-base",
				lg: "h-12 px-8 text-lg",
				icon: "h-10 w-10 p-0",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
)

export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, type, ...props }, ref) => {
		const Comp = asChild ? Slot : "button"
		return (
			<Comp
				ref={ref}
				type={asChild ? undefined : (type ?? "button")}
				className={cn(buttonVariants({ variant, size }), className)}
				{...props}
			/>
		)
	},
)
Button.displayName = "Button"

export { buttonVariants }
```

- [ ] **Step 4: Executar o teste para confirmar aprovação**

```bash
pnpm --filter frontend test -- -t "deve renderizar com rounded-md por padrão"
```

Esperado: PASS.

- [ ] **Step 5: Atualizar input.tsx — rounded-full → rounded-md e corrigir token de paleta**

Substituir o conteúdo de `apps/frontend/src/components/ui/input.tsx`:

```typescript
import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, type = "text", ...props }, ref) => {
		return (
			<input
				ref={ref}
				type={type}
				className={cn(
					"flex h-10 w-full rounded-md border border-input bg-background px-4 py-2 text-base text-foreground",
					"placeholder:text-muted-foreground",
					"transition-colors",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"file:border-0 file:bg-transparent file:text-sm file:font-medium",
					className,
				)}
				{...props}
			/>
		)
	},
)
Input.displayName = "Input"
```

Mudanças em relação ao original:
- `rounded-full` → `rounded-md`
- `border-border` → `border-input` (token específico de input)
- `px-5` → `px-4` (ajuste proporcional ao novo radius)
- `placeholder:text-silver` → `placeholder:text-muted-foreground` (corrige uso de token de paleta estático)

- [ ] **Step 6: Verificar lint, tipos e testes**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test
```

Esperado: zero erros e todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/components/ui/button.tsx \
        apps/frontend/src/components/ui/button.test.tsx \
        apps/frontend/src/components/ui/input.tsx
git commit -m "feat(frontend/ui): trocar geometria pill por rounded-md em Button e Input"
```

## Critérios de Sucesso

- `Button` usa `rounded-md` — não usa mais `rounded-full`
- `Input` usa `rounded-md` e `placeholder:text-muted-foreground`
- `Input` não referencia `text-silver` (token de paleta removido)
- Todos os testes de `button.test.tsx` passam
- `pnpm --filter frontend lint:fix` e `tsc:check` passam com zero issues
