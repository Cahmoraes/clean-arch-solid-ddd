# Task 6: MotionToggle nos dois shells [FR-013]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-05

## Visão Geral

Cria o botão "Pausar animações", acessível por teclado e leitor de tela, e o coloca nos dois shells. A escolha é a mesma preferência compartilhada do hook `useSceneMotion`, então pausar aqui para todas as cenas e é lembrado no navegador.

Nota de escopo: a spec diz que o controle fica "ao lado do `ThemeToggle`" nos dois shells, mas o `PublicShell` não tem `ThemeToggle` (só o shell autenticado tem). No shell público o `MotionToggle` entra no `<nav>` antes dos links; não se adiciona `ThemeToggle` ali (fora de escopo).

## Arquivos

- Create: `apps/frontend/src/components/ui/motion-toggle.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Modify: `apps/frontend/src/components/layout/public-shell.tsx`
- Test: `apps/frontend/src/components/ui/motion-toggle.test.tsx`
- Test: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`
- Test: `apps/frontend/src/components/layout/public-shell.test.tsx`

## Interfaces

- **Consome:** de task-05, `apps/frontend/src/lib/hooks/use-scene-motion.ts`:
  - `export function useUserMotionPause(): { userPaused: boolean; toggleUserPause: () => void }`
  - `export function setUserPause(paused: boolean): void` (só nos testes, para restaurar o estado entre casos)
  - `export const SCENE_MOTION_STORAGE_KEY = "volt:scene-motion-paused"`
- **Produz:** `apps/frontend/src/components/ui/motion-toggle.tsx`:
  - `export interface MotionToggleProps { className?: string; compact?: boolean }`
  - `export function MotionToggle({ className, compact }: MotionToggleProps)` (botão com `aria-label` "Pausar animações" / "Retomar animações" e `aria-pressed`; retorna `null` até montar)

### Conformidade com as Skills Padrão

- `vercel-composition-patterns`: as duas variantes (completa e `compact`) seguem o par do `ThemeToggle`, sem proliferação de props booleanas além de `compact`.
- `vercel-react-best-practices`: guarda de montagem com `useEffect`, hook compartilhado em vez de estado duplicado.
- `typescript-advanced`: props tipadas com interface exportada.
- `wcag-audit-patterns`: botão nativo (teclado), nome acessível, `aria-pressed`, alvo de 36px ou mais, anel de foco duplo.
- `test-antipatterns`: os testes clicam no botão e observam o estado compartilhado, sem espiar internals.
- `no-workarounds`: nenhuma supressão; o estado vem do hook da tarefa 5.

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/components/ui/motion-toggle.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import {
	SCENE_MOTION_STORAGE_KEY,
	setUserPause,
	useUserMotionPause,
} from "@/lib/hooks/use-scene-motion"
import { MotionToggle } from "./motion-toggle"

function SharedState() {
	const { userPaused } = useUserMotionPause()
	return <output data-testid="shared">{String(userPaused)}</output>
}

afterEach(() => {
	window.localStorage.clear()
	act(() => setUserPause(false))
})

describe("MotionToggle", () => {
	test("é um botão com nome acessível Pausar animações e não pressionado", () => {
		render(<MotionToggle />)
		const button = screen.getByRole("button", { name: "Pausar animações" })
		expect(button).toHaveAttribute("aria-pressed", "false")
	})

	test("ao clicar, passa a se chamar Retomar animações, fica pressionado e grava a escolha", () => {
		render(<MotionToggle />)
		fireEvent.click(screen.getByRole("button", { name: "Pausar animações" }))
		const button = screen.getByRole("button", { name: "Retomar animações" })
		expect(button).toHaveAttribute("aria-pressed", "true")
		expect(window.localStorage.getItem(SCENE_MOTION_STORAGE_KEY)).toBe("true")
	})

	test("clicar de novo retoma as animações", () => {
		render(<MotionToggle />)
		fireEvent.click(screen.getByRole("button", { name: "Pausar animações" }))
		fireEvent.click(screen.getByRole("button", { name: "Retomar animações" }))
		expect(
			screen.getByRole("button", { name: "Pausar animações" }),
		).toHaveAttribute("aria-pressed", "false")
	})

	test("a escolha é compartilhada com quem lê a preferência (as cenas)", () => {
		render(
			<>
				<MotionToggle />
				<SharedState />
			</>,
		)
		expect(screen.getByTestId("shared")).toHaveTextContent("false")
		fireEvent.click(screen.getByRole("button", { name: "Pausar animações" }))
		expect(screen.getByTestId("shared")).toHaveTextContent("true")
	})

	test("compact: botão redondo de 36px como o ThemeToggle compacto", () => {
		render(<MotionToggle compact />)
		const button = screen.getByRole("button", { name: "Pausar animações" })
		expect(button).toHaveClass("h-9", "w-9", "rounded-full")
	})

	test("completo: botão redondo com borda, sem texto visível", () => {
		render(<MotionToggle />)
		const button = screen.getByRole("button", { name: "Pausar animações" })
		expect(button).toHaveClass("rounded-full", "border")
		expect(button.textContent).toBe("")
	})

	test("aceita className para o controle de visibilidade responsiva", () => {
		render(<MotionToggle className="max-[560px]:hidden" />)
		expect(
			screen.getByRole("button", { name: "Pausar animações" }),
		).toHaveClass("max-[560px]:hidden")
	})
})
```

Acrescentar ao final de `apps/frontend/src/components/layout/authenticated-shell.test.tsx` (helpers e imports já existem no arquivo; acrescentar `within` ao import de `@testing-library/react`):

```tsx
describe("AuthenticatedShell — controle de animações", () => {
	test("exibe o MotionToggle nas duas variantes ao lado do ThemeToggle", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const header = within(screen.getByRole("banner"))
		const motionButtons = header.getAllByRole("button", {
			name: "Pausar animações",
		})
		const themeButtons = header.getAllByRole("button", { name: /modo/i })
		expect(motionButtons).toHaveLength(2)
		expect(themeButtons).toHaveLength(2)
		expect(motionButtons[0]?.parentElement).toBe(
			themeButtons[0]?.parentElement,
		)
	})

	test("as variantes completa e compacta seguem as mesmas classes de visibilidade do ThemeToggle", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const [full, compact] = within(screen.getByRole("banner")).getAllByRole(
			"button",
			{ name: "Pausar animações" },
		)
		expect(full).toHaveClass("max-[560px]:hidden")
		expect(compact).toHaveClass("hidden", "max-[560px]:flex")
	})
})
```

Acrescentar ao final de `apps/frontend/src/components/layout/public-shell.test.tsx`:

```tsx
describe("PublicShell — controle de animações", () => {
	test("exibe o MotionToggle no nav, antes dos links", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		const nav = screen.getByRole("navigation", { name: /navegação principal/i })
		const toggle = screen.getByRole("button", { name: "Pausar animações" })
		const firstLink = screen.getByRole("link", { name: /clima/i })
		expect(nav).toContainElement(toggle)
		expect(
			toggle.compareDocumentPosition(firstLink) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()
	})

	test("não adiciona ThemeToggle ao shell público", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		expect(screen.queryByRole("button", { name: /modo/i })).toBeNull()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/components/ui/motion-toggle.test.tsx src/components/layout/authenticated-shell.test.tsx src/components/layout/public-shell.test.tsx`
Expected: FAIL. `motion-toggle.test.tsx` falha com `Failed to resolve import "./motion-toggle"`; os testes novos dos shells falham com `Unable to find an accessible element with the role "button" and name "Pausar animações"`.

- **Step 3: Write minimal implementation**

Criar `apps/frontend/src/components/ui/motion-toggle.tsx`:

```tsx
"use client"

import { Pause, Play } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"
import { useUserMotionPause } from "@/lib/hooks/use-scene-motion"

export interface MotionToggleProps {
	className?: string
	compact?: boolean
}

export function MotionToggle({ className, compact }: MotionToggleProps) {
	const { userPaused, toggleUserPause } = useUserMotionPause()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) return null

	const Icon = userPaused ? Play : Pause
	const label = userPaused ? "Retomar animações" : "Pausar animações"

	return (
		<button
			type="button"
			onClick={toggleUserPause}
			aria-label={label}
			aria-pressed={userPaused}
			className={cn(
				"focus-ring-duplo inline-flex items-center justify-center rounded-full",
				compact
					? "h-9 w-9 bg-accent text-accent-foreground"
					: "h-[38px] w-[38px] border border-border bg-surface-2 text-foreground",
				className,
			)}
		>
			<Icon className="h-4 w-4" aria-hidden="true" />
		</button>
	)
}
```

Em `apps/frontend/src/components/layout/authenticated-shell.tsx`: importar `import { MotionToggle } from "@/components/ui/motion-toggle"` (ordem alfabética dos imports do Biome, entre `BrandMark` e `SearchBar`) e, no `<div className="ml-auto flex items-center gap-3">` do header, logo depois dos dois `ThemeToggle`, inserir:

```tsx
						<MotionToggle className="max-[560px]:hidden" />
						<MotionToggle compact className="hidden max-[560px]:flex" />
```

Em `apps/frontend/src/components/layout/public-shell.tsx`: importar `import { MotionToggle } from "@/components/ui/motion-toggle"` depois do import de `BrandMark` e, no `<nav aria-label="Navegação principal" ...>`, inserir `<MotionToggle />` como primeiro filho, antes do link "Clima".

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/components/ui/motion-toggle.test.tsx src/components/layout/authenticated-shell.test.tsx src/components/layout/public-shell.test.tsx src/app/layout.test.tsx`
Expected: PASS

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/components/ui/motion-toggle.tsx apps/frontend/src/components/ui/motion-toggle.test.tsx apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx apps/frontend/src/components/layout/public-shell.tsx apps/frontend/src/components/layout/public-shell.test.tsx
git commit -m "feat(frontend): MotionToggle nos shells autenticado e público"
```

## Critérios de Sucesso

- Os dois shells exibem o controle "Pausar animações", operável por teclado (botão nativo) e com `aria-pressed` (FR-013).
- No shell autenticado o controle fica ao lado do `ThemeToggle`, com o mesmo par completo/compacto e as mesmas classes de visibilidade; no shell público fica no `<nav>` antes dos links.
- Clicar alterna o rótulo para "Retomar animações", grava a escolha e a preferência é a mesma lida pelas cenas.
- A estrutura dos shells não mudou além da inclusão do controle.
