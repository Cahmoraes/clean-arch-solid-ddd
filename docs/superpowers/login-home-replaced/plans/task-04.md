# Task 4: Toggles de tema e movimento no header público [FR-002, FR-015]

**Status:** PENDING

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** cheap

## Visão Geral

Coloca o `MotionToggle` e o `ThemeToggle` no header do `PublicShell`, à direita da navegação, para que visitantes (não só usuários autenticados) escolham tema e pausem animações. Segue o mesmo padrão responsivo já usado no `authenticated-shell.tsx` (versão completa acima de 560px, `compact` abaixo).

## Arquivos

- Modify: `apps/frontend/src/components/layout/public-shell.tsx`
- Test: `apps/frontend/src/components/layout/public-shell.test.tsx`

## Interfaces

- **Consome:** `ThemeToggle({ className?: string; compact?: boolean }): JSX.Element` (task-02); `MotionToggle({ className?: string }): JSX.Element` (task-03).
- **Produz:** N/A.

### Skills a invocar

- `wcag-audit-patterns`: os dois controles precisam continuar operáveis por teclado e com nome acessível dentro do header (nenhuma mudança de semântica do `nav`).
- `vercel-composition-patterns`: compor os dois toggles dentro do `nav` existente sem duplicar o padrão responsivo já usado em `authenticated-shell.tsx`.
- `test-antipatterns`: mockar `next-themes` no teste do `PublicShell` (mesmo padrão do `theme-toggle.test.tsx`), em vez de deixar o `ThemeToggle` sem tema resolvido.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/login-home-replaced-visual.md`.
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o header público com os dois toggles?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` e MCP `claude-in-chrome` — comparar o header em `/` e `/login` com o padrão já usado em `authenticated-shell.tsx` (mesmo espaçamento e ponto de quebra `max-[560px]`).
- **Decisões visuais já tomadas (não refazer):** posição dos toggles = header do `PublicShell`, à direita da navegação (Decisão local da spec, "Posição dos toggles públicos"); breakpoint de 560px para a versão `compact` do `ThemeToggle` já definido em `authenticated-shell.tsx`.

## Passos

- **Step 1: Write the failing test**

Substituir, em `apps/frontend/src/components/layout/public-shell.test.tsx`, as duas asserções que hoje verificam a **ausência** do controle de pausa e do `ThemeToggle` pelas asserções de presença abaixo (mantendo o restante do arquivo, incluindo `vi.mock("next-themes", ...)` se ainda não existir):

```tsx
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { PublicShell } from "./public-shell"

vi.mock("next-themes", () => ({
	useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}))

describe("PublicShell", () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.removeAttribute("data-motion-paused")
	})

	test("exibe o controle de pausa de animações no header público", () => {
		render(
			<PublicShell>
				<div />
			</PublicShell>,
		)
		expect(
			screen.getByRole("button", { name: "Pausar animações" }),
		).toBeInTheDocument()
	})

	test("exibe o seletor de tema no header público", () => {
		render(
			<PublicShell>
				<div />
			</PublicShell>,
		)
		expect(screen.getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/layout/public-shell.test.tsx`
Expected: FAIL — o header atual não renderiza `MotionToggle` nem `ThemeToggle`; `getByRole("button", { name: "Pausar animações" })` e `getByRole("radiogroup", { name: "Tema" })` não encontram elemento.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/components/layout/public-shell.tsx`:

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { BrandMark } from "@/components/ui/brand-mark"
import { MotionToggle } from "@/components/ui/motion-toggle"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from "@/lib/cn"
```

E dentro do `<nav aria-label="Navegação principal" ...>`, após o link "Criar conta":

```tsx
<div className="ml-2 flex items-center gap-2 border-l border-border pl-2">
	<MotionToggle />
	<ThemeToggle className="max-[560px]:hidden" />
	<ThemeToggle compact className="hidden max-[560px]:flex" />
</div>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/layout/public-shell.test.tsx`
Expected: PASS — os dois testes novos passam; os demais testes do arquivo (links de navegação, `data-testid="public-shell"`, rodapé) continuam passando sem alteração.

- **Step 5: Commit**

```bash
git add apps/frontend/src/components/layout/public-shell.tsx apps/frontend/src/components/layout/public-shell.test.tsx
git commit -m "feat(public-shell): adiciona MotionToggle e ThemeToggle ao header publico"
```

## Critérios de Sucesso

- O header de `/` e `/login` exibe `MotionToggle` ("Pausar animações"/"Retomar animações") (FR-015).
- O header exibe o `ThemeToggle` completo acima de 560px e `compact` abaixo, mesmo padrão de `authenticated-shell.tsx` (FR-002).
- `public-shell.test.tsx` não contém mais asserções de ausência para esses dois controles.
