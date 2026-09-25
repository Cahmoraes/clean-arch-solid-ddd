# Task 2: ThemeToggle de 3 estados com ícone Sunset [FR-002, FR-004]

**Status:** PENDING

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** standard

## Visão Geral

Substitui o `ThemeToggle` binário (dark/light) por um seletor de 3 estados (Neon, Pôr do sol, Neblina), com um novo ícone pixel-art `Sunset`. A versão completa vira um `radiogroup` acessível com os 3 temas visíveis; a versão `compact` continua um único botão, agora ciclando entre os três. Um tema salvo desconhecido (inclusive `undefined`/`"system"` não resolvido) cai em Neon.

## Arquivos

- Modify: `apps/frontend/src/components/ui/pixel-icons.tsx`
- Modify: `apps/frontend/src/components/ui/theme-toggle.tsx`
- Test: `apps/frontend/src/components/ui/theme-toggle.test.tsx`

## Interfaces

- **Consome:** tema `"sunset"` válido no `next-themes` via `ThemeProvider` com `themes={["light", "dark", "sunset"]}` (task-01).
- **Produz:** `ThemeToggle({ className?: string; compact?: boolean }): JSX.Element` (mesma assinatura pública); `Sunset: PixelIcon` — consumidos por task-04 (toggles no header público).

### Skills a invocar

- `wcag-audit-patterns`: `role="radiogroup"`/`role="radio"` com `aria-checked` e `aria-label` por tema; nome acessível do próximo tema no `compact`.
- `shadcn`: padrão de composição de botão-ícone dentro de um grupo (mesmo sem usar Radix diretamente, o vocabulário ARIA é o do Radix RadioGroup).
- `vercel-react-best-practices`: manter o componente cliente pequeno, sem re-render desnecessário do grupo.
- `test-antipatterns`: mockar `next-themes` (inclusive `resolvedTheme`) em vez de montar um `ThemeProvider` real no teste.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/login-home-replaced-visual.md` (tabela de tokens Neon/Pôr do sol e "Ícones pixel-art").
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o ícone `Sunset` além do mockup?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` e MCP `claude-in-chrome` (screenshot da página com o toggle renderizado) — comparar contra o padrão visual dos ícones `Moon`/`Sun` já existentes em `pixel-icons.tsx`.
- **Decisões visuais já tomadas (não refazer):** ícones do módulo `pixel-icons` vendorizado (grade 24x24, blocos de 2px, `shapeRendering="crispEdges"`); sem ícone de pôr do sol pronto — desenhar um novo no mesmo módulo, nunca importar de outra lib (guard `no-lucide.test.ts`); tamanhos só `h-4 w-4` (16px) neste componente.

## Passos

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/components/ui/theme-toggle.test.tsx
import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const setTheme = vi.fn()
let currentResolvedTheme: string | undefined = "dark"

vi.mock("next-themes", () => ({
	useTheme: () => ({ resolvedTheme: currentResolvedTheme, setTheme }),
}))

import { ThemeToggle } from "./theme-toggle"

describe("ThemeToggle", () => {
	beforeEach(() => {
		setTheme.mockClear()
		currentResolvedTheme = "dark"
	})

	test("versão completa exibe um radiogroup com os 3 temas e marca o atual", () => {
		render(<ThemeToggle />)
		const group = screen.getByRole("radiogroup", { name: "Tema" })
		const radios = within(group).getAllByRole("radio")
		expect(radios).toHaveLength(3)
		expect(screen.getByRole("radio", { name: "Tema Neon" })).toHaveAttribute(
			"aria-checked",
			"true",
		)
	})

	test("clicar em Pôr do sol chama setTheme com sunset", () => {
		render(<ThemeToggle />)
		fireEvent.click(screen.getByRole("radio", { name: "Tema Pôr do sol" }))
		expect(setTheme).toHaveBeenCalledWith("sunset")
	})

	test("clicar em Neblina chama setTheme com light", () => {
		render(<ThemeToggle />)
		fireEvent.click(screen.getByRole("radio", { name: "Tema Neblina" }))
		expect(setTheme).toHaveBeenCalledWith("light")
	})

	test("compact percorre o ciclo Neon -> Pôr do sol -> Neblina -> Neon", () => {
		const { rerender } = render(<ThemeToggle compact />)
		expect(
			screen.getByRole("button", { name: "Ativar tema Pôr do sol" }),
		).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Ativar tema Pôr do sol" }))
		expect(setTheme).toHaveBeenCalledWith("sunset")

		currentResolvedTheme = "sunset"
		rerender(<ThemeToggle compact />)
		expect(
			screen.getByRole("button", { name: "Ativar tema Neblina" }),
		).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Ativar tema Neblina" }))
		expect(setTheme).toHaveBeenCalledWith("light")

		currentResolvedTheme = "light"
		rerender(<ThemeToggle compact />)
		expect(
			screen.getByRole("button", { name: "Ativar tema Neon" }),
		).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Ativar tema Neon" }))
		expect(setTheme).toHaveBeenCalledWith("dark")
	})

	test("valor de tema desconhecido é tratado como Neon", () => {
		currentResolvedTheme = undefined
		render(<ThemeToggle />)
		expect(screen.getByRole("radio", { name: "Tema Neon" })).toHaveAttribute(
			"aria-checked",
			"true",
		)
	})

	test("sem rounded-full no compact nem no completo", () => {
		const { container, rerender } = render(<ThemeToggle compact />)
		expect(container.querySelector(".rounded-full")).toBeNull()
		rerender(<ThemeToggle />)
		expect(container.querySelector(".rounded-full")).toBeNull()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/theme-toggle.test.tsx`
Expected: FAIL — o componente atual usa `useTheme().theme` (binário `dark`/`light`, sem `resolvedTheme`), renderiza um único `<button>` (sem `role="radiogroup"`/`role="radio"`) e não conhece o tema `sunset`; `getByRole("radiogroup", { name: "Tema" })` não encontra elemento.

- **Step 3: Write minimal implementation**

Adicionar o ícone `Sunset` em `apps/frontend/src/components/ui/pixel-icons.tsx` (mesmo padrão de `Moon`/`Sun`: grade 24x24, blocos de 2px, meio-sol acima de uma linha de horizonte e 2 faixas abaixo):

```tsx
export const Sunset: PixelIcon = (props) => (
	<PixelSvg
		d="M10 8h4v2h-4zM8 10h8v2H8zM6 12h12v2H6zM4 14h16v2H4zM2 16h20v2H2zM4 19h16v1H4zM4 21h16v1H4z"
		{...props}
	/>
)
```

Reescrever `apps/frontend/src/components/ui/theme-toggle.tsx`:

```tsx
"use client"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { type PixelIcon, Moon, Sun, Sunset } from "@/components/ui/pixel-icons"
import { cn } from "@/lib/cn"

type ThemeName = "dark" | "sunset" | "light"

const THEME_ORDER: readonly ThemeName[] = ["dark", "sunset", "light"]

const THEME_OPTIONS: Record<
	ThemeName,
	{ label: string; ariaLabel: string; Icon: PixelIcon }
> = {
	dark: { label: "Neon", ariaLabel: "Tema Neon", Icon: Moon },
	sunset: { label: "Pôr do sol", ariaLabel: "Tema Pôr do sol", Icon: Sunset },
	light: { label: "Neblina", ariaLabel: "Tema Neblina", Icon: Sun },
}

function resolveThemeName(theme: string | undefined): ThemeName {
	if (theme === "dark" || theme === "sunset" || theme === "light") return theme
	return "dark"
}

function nextTheme(current: ThemeName): ThemeName {
	const index = THEME_ORDER.indexOf(current)
	return THEME_ORDER[(index + 1) % THEME_ORDER.length]
}

export interface ThemeToggleProps {
	className?: string
	compact?: boolean
}

export function ThemeToggle({ className, compact }: ThemeToggleProps) {
	const { resolvedTheme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)
	useEffect(() => {
		setMounted(true)
	}, [])
	if (!mounted) return null

	const current = resolveThemeName(resolvedTheme)

	if (compact) {
		const upcoming = nextTheme(current)
		const { Icon } = THEME_OPTIONS[current]
		return (
			<button
				type="button"
				onClick={() => setTheme(upcoming)}
				aria-label={`Ativar tema ${THEME_OPTIONS[upcoming].label}`}
				className={cn(
					"inline-flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground",
					className,
				)}
			>
				<Icon key={current} className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
			</button>
		)
	}

	return (
		<div
			role="radiogroup"
			aria-label="Tema"
			className={cn(
				"inline-flex items-center gap-1 rounded-xs border border-border bg-surface-2 p-1.5",
				className,
			)}
		>
			{THEME_ORDER.map((name) => {
				const { ariaLabel, Icon } = THEME_OPTIONS[name]
				const checked = name === current
				return (
					<button
						key={name}
						type="button"
						role="radio"
						aria-checked={checked}
						aria-label={ariaLabel}
						onClick={() => setTheme(name)}
						className={cn(
							"inline-flex h-[28px] w-[28px] items-center justify-center rounded-xs",
							checked
								? "bg-accent text-accent-foreground"
								: "text-foreground",
						)}
					>
						<Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
					</button>
				)
			})}
		</div>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/theme-toggle.test.tsx`
Expected: PASS — todos os testes do arquivo (radiogroup com 3 opções, clique por tema, ciclo completo do `compact`, fallback para Neon, ausência de `rounded-full`).

- **Step 5: Commit**

```bash
git add apps/frontend/src/components/ui/pixel-icons.tsx apps/frontend/src/components/ui/theme-toggle.tsx apps/frontend/src/components/ui/theme-toggle.test.tsx
git commit -m "feat(theme-toggle): seletor de 3 temas com icone Sunset"
```

## Critérios de Sucesso

- Versão completa do `ThemeToggle` expõe `role="radiogroup"` com 3 `role="radio"`, `aria-checked` no tema atual, `aria-label` por tema (FR-002).
- Versão `compact` cicla Neon → Pôr do sol → Neblina → Neon, com `aria-label` nomeando o próximo tema (FR-002).
- Um `resolvedTheme` fora dos 3 valores (inclusive `undefined`) resolve para Neon (FR-004).
- API pública (`className`, `compact`) permanece igual à usada em `authenticated-shell.tsx`.
- Nenhum uso de `rounded-full` ou ícone fora de `pixel-icons.tsx`.
