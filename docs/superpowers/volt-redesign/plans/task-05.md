# Task 5: ThemeToggle deslizante (substitui o FAB) [RF-002]

**Status:** DONE
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Substitui o `ThemeToggleFAB` (botão emoji flutuante) pelo `ThemeToggle` do VOLT: um pill deslizante com knob accent e labels "Claro"/"Escuro", colapsando para botão-ícone em telas estreitas. O componente é montado temporariamente no `layout.tsx` (mantendo o toggle funcional) e será movido para a topbar na Task 6.

## Arquivos

- Create: `apps/frontend/src/components/ui/theme-toggle.tsx`
- Create: `apps/frontend/src/components/ui/theme-toggle.test.tsx`
- Delete: `apps/frontend/src/components/ui/theme-toggle-fab.tsx`
- Delete: `apps/frontend/src/components/ui/theme-toggle-fab.test.tsx`
- Modify: `apps/frontend/src/app/layout.tsx`

### Conformidade com as Skills Padrão

- use code-style: guard de hidratação (`mounted`), `aria-label` semântico, sem emojis como ícone semântico
- use test-antipatterns: mockar `next-themes` (dependência externa) e asserir o `setTheme` chamado

## Passos

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/components/ui/theme-toggle.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const setTheme = vi.fn()
let currentTheme = "dark"

vi.mock("next-themes", () => ({
	useTheme: () => ({ theme: currentTheme, setTheme }),
}))

import { ThemeToggle } from "./theme-toggle"

describe("ThemeToggle", () => {
	beforeEach(() => {
		setTheme.mockClear()
		currentTheme = "dark"
	})

	test("alterna para light quando o tema atual é dark", () => {
		render(<ThemeToggle />)
		fireEvent.click(screen.getByRole("button", { name: /tema/i }))
		expect(setTheme).toHaveBeenCalledWith("light")
	})

	test("alterna para dark quando o tema atual é light", () => {
		currentTheme = "light"
		render(<ThemeToggle />)
		fireEvent.click(screen.getByRole("button", { name: /tema/i }))
		expect(setTheme).toHaveBeenCalledWith("dark")
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "ThemeToggle"`
Expected: FAIL — módulo `./theme-toggle` não existe.

- [ ] **Step 3: Implementar `theme-toggle.tsx`**

```tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"

export interface ThemeToggleProps {
	className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
	const { theme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) return null

	const isDark = theme === "dark"

	return (
		<button
			type="button"
			onClick={() => setTheme(isDark ? "light" : "dark")}
			aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
			aria-pressed={isDark}
			className={cn(
				"relative inline-flex h-[42px] w-[132px] items-center rounded-full border border-border bg-surface-2 p-1 max-[860px]:w-[42px]",
				className,
			)}
		>
			<span
				className={cn(
					"absolute top-1 z-[2] inline-flex h-8 w-[34px] items-center justify-center rounded-full bg-accent text-accent-foreground transition-[left] duration-300",
					isDark ? "left-[calc(100%-38px)] max-[860px]:left-1" : "left-1",
				)}
			>
				{isDark ? (
					<Moon className="h-4 w-4" aria-hidden="true" />
				) : (
					<Sun className="h-4 w-4" aria-hidden="true" />
				)}
			</span>
			<span className="flex-1 pl-[22px] text-center text-xs font-semibold text-subtle max-[860px]:hidden">
				Claro
			</span>
			<span className="flex-1 pr-[22px] text-center text-xs font-semibold text-subtle max-[860px]:hidden">
				Escuro
			</span>
		</button>
	)
}
```

- [ ] **Step 4: Remover o FAB antigo e montar o novo toggle em `layout.tsx`**

Apague os arquivos:

```bash
git rm apps/frontend/src/components/ui/theme-toggle-fab.tsx apps/frontend/src/components/ui/theme-toggle-fab.test.tsx
```

Em `apps/frontend/src/app/layout.tsx`, troque o import:

```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle"
```

E troque o mount `<ThemeToggleFAB />` por um wrapper fixo temporário (será movido para a topbar na Task 6):

```tsx
<div className="fixed bottom-6 right-6 z-50">
	<ThemeToggle />
</div>
```

- [ ] **Step 5: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "ThemeToggle"`
Expected: PASS (2 testes).

- [ ] **Step 6: Lint, tsc, suíte completa e build**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test && pnpm --filter frontend build`
Expected: tudo verde (sem referências remanescentes a `ThemeToggleFAB`).

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/components/ui/theme-toggle.tsx apps/frontend/src/components/ui/theme-toggle.test.tsx apps/frontend/src/app/layout.tsx
git commit -m "feat(volt-redesign): ThemeToggle deslizante substitui o FAB de tema"
```

## Critérios de Sucesso

- `ThemeToggle` alterna entre light/dark via next-themes [RF-002]
- Guard de hidratação evita mismatch SSR
- Pill deslizante colapsa para ícone abaixo de 860px
- Nenhuma referência a `ThemeToggleFAB` permanece
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
