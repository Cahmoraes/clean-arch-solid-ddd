# Task 1: Remover texto do ThemeToggle e animar ícone na troca de tema

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/theme-toggle-icon-only-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Remove os textos visíveis "Claro"/"Escuro" do `ThemeToggle` (header autenticado), deixando os ícones `Sun`/`Moon` comunicarem o estado sozinhos, em qualquer largura de tela (sem o breakpoint especial `max-[860px]` que hoje só esconde o texto abaixo de 860px). Reduz a largura do pill de 128px para 64px e adiciona uma transição leve (fade + rotate) ao próprio ícone durante a troca, respeitando `prefers-reduced-motion`, seguindo o mesmo padrão de `@media (prefers-reduced-motion: no-preference)` já usado em `globals.css` para `.route-fade`/`.shimmer`.

## Arquivos

- Modify: `apps/frontend/src/components/ui/theme-toggle.tsx`
- Modify: `apps/frontend/src/components/ui/theme-toggle.test.tsx`
- Modify: `apps/frontend/src/app/globals.css`

### Conformidade com as Skills Padrão

- `frontend-design`: task é orientada por um mockup visual aprovado (variante A do companion), com decisões de layout/spacing/tokens já tomadas — a skill orienta a manter fidelidade a essas decisões durante a implementação.
- `tailwindcss`: todas as mudanças de tamanho, posicionamento do pill e classes condicionais usam utilitários Tailwind v4 (`w-16`, `left-[...]`, `transition-[left]`); a skill cobre convenções de arbitrary values e organização de classes.
- `vercel-react-best-practices`: o componente é um Client Component React (`"use client"`) com `useState`/`useEffect` para evitar mismatch de hidratação; a skill cobre padrões de componente client-side em apps Next.js.
- `test-antipatterns`: task inclui escrita de novos testes (ausência de texto visível, tamanho compacto sem breakpoint); a skill orienta a evitar asserções frágeis/acopladas a detalhes de implementação.
- `refactoring`: a mudança remove código existente (spans de texto, lógica de breakpoint) de um componente já em produção sem alterar seu contrato público (`ThemeToggleProps`); a skill cobre como simplificar com segurança.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/theme-toggle-icon-only-visual.md` (baseline de layout/spacing/tokens — variante A, pill deslizante compacto)
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion visual desta sessão de brainstorming.
- **Confirmar com o usuário:** não aplicável — usuário já aprovou a variante A diretamente no companion visual durante o brainstorming; nenhuma fonte externa (Figma/export) foi mencionada.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de design-to-code dedicada configurada neste repo; usar `playwright-cli` (ou a skill `claude-in-chrome`, se disponível na sessão) para abrir `pnpm --filter frontend dev` e conferir visualmente o resultado contra o mockup curado — construção manual a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** pill sempre compacto (~64px, sem breakpoint especial), thumb mantém o slide horizontal existente (`transition-[left] duration-300`), ícone dentro do thumb ganha transição própria leve (fade/rotate, ~150-200ms) além do slide do container, cores/tokens do design system atual sem novos tokens.

## Passos

- **Step 1: Escrever os testes que falham**

Atualize `apps/frontend/src/components/ui/theme-toggle.test.tsx` acrescentando dois novos testes aos dois já existentes:

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
		fireEvent.click(screen.getByRole("button", { name: /modo/i }))
		expect(setTheme).toHaveBeenCalledWith("light")
	})

	test("alterna para dark quando o tema atual é light", () => {
		currentTheme = "light"
		render(<ThemeToggle />)
		fireEvent.click(screen.getByRole("button", { name: /modo/i }))
		expect(setTheme).toHaveBeenCalledWith("dark")
	})

	test("não exibe texto visível de Claro/Escuro", () => {
		render(<ThemeToggle />)
		expect(screen.queryByText("Claro")).toBeNull()
		expect(screen.queryByText("Escuro")).toBeNull()
	})

	test("mantém o mesmo tamanho compacto em qualquer largura, sem breakpoint especial", () => {
		render(<ThemeToggle />)
		const button = screen.getByRole("button", { name: /modo/i })
		expect(button.className).toContain("w-16")
		expect(button.className).not.toContain("max-[860px]")
	})
})
```

- **Step 2: Rodar os testes para confirmar que os dois novos falham**

Run: `pnpm --filter frontend test -- --run src/components/ui/theme-toggle.test.tsx`
Expected: FAIL — os testes "alterna para..." (2) passam; "não exibe texto visível de Claro/Escuro" falha (`queryByText("Claro")` encontra o elemento) e "mantém o mesmo tamanho compacto..." falha (`button.className` contém `w-[128px]` e `max-[860px]`, não `w-16`).

- **Step 3: Implementar a remoção do texto e o novo tamanho compacto**

Substitua o conteúdo de `apps/frontend/src/components/ui/theme-toggle.tsx`:

```tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/cn"

const THEME_CONFIG = {
	dark: {
		next: "light" as const,
		ariaLabel: "Ativar modo claro",
		pillLeft: "left-[31px]",
		Icon: Moon,
	},
	light: {
		next: "dark" as const,
		ariaLabel: "Ativar modo escuro",
		pillLeft: "left-[5px]",
		Icon: Sun,
	},
}

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
	const { next, ariaLabel, pillLeft, Icon } =
		THEME_CONFIG[isDark ? "dark" : "light"]

	return (
		<button
			type="button"
			onClick={() => setTheme(next)}
			aria-label={ariaLabel}
			aria-pressed={isDark}
			className={cn(
				"relative inline-flex h-[38px] w-16 items-center rounded-full border border-border bg-surface-2 p-1.5",
				className,
			)}
		>
			<span
				className={cn(
					"absolute top-[5px] z-[2] inline-flex h-[28px] w-[28px] items-center justify-center rounded-full bg-accent text-accent-foreground transition-[left] duration-300",
					pillLeft,
				)}
			>
				<Icon
					key={isDark ? "moon" : "sun"}
					className="theme-toggle-icon h-3.5 w-3.5 flex-shrink-0"
					aria-hidden="true"
				/>
			</span>
		</button>
	)
}
```

Notas da mudança em relação ao componente atual: remove os dois `<span>` de texto fixo ("Claro"/"Escuro") e o `<span>{activeLabel}</span>` dentro do pill; remove `claroClass`/`escuroClass`/`activeLabel` do `THEME_CONFIG`; troca `w-[128px]` (com `max-[860px]:w-[38px]`) por `w-16` fixo; troca `min-w-[66px]` (com variantes `max-[860px]`) por `w-[28px]` fixo; recalcula `pillLeft` para o novo container de 64px (`left-[31px]` no dark = 64 - 5 (margem direita) - 28 (largura do thumb) = 31px); adiciona `key={isDark ? "moon" : "sun"}` no ícone para forçar remontagem e disparar a animação CSS a cada troca; adiciona a classe `theme-toggle-icon` (definida no Step 5) ao ícone.

- **Step 4: Rodar os testes para confirmar que passam**

Run: `pnpm --filter frontend test -- --run src/components/ui/theme-toggle.test.tsx`
Expected: PASS — os 4 testes passam.

- **Step 5: Adicionar a transição leve do ícone (fade + rotate) respeitando `prefers-reduced-motion`**

Este passo não tem teste automatizado dedicado: CSS `@keyframes`/`animation` não é verificável de forma confiável em `happy-dom` (ambiente de teste do projeto), então a verificação é visual, conferida contra o mockup em `../specs/mockups/theme-toggle-icon-only-visual.md` (ver `### Fidelidade Visual` acima). Essa exceção já está registrada no spec, seção "Testes".

Adicione ao final de `apps/frontend/src/app/globals.css`, seguindo o mesmo padrão já usado por `.route-fade`/`.shimmer` (keyframe top-level + `@media (prefers-reduced-motion: no-preference)` envolvendo a classe):

```css
@keyframes themeToggleIconIn {
	from {
		opacity: 0;
		transform: rotate(-90deg) scale(0.6);
	}
	to {
		opacity: 1;
		transform: rotate(0deg) scale(1);
	}
}

@media (prefers-reduced-motion: no-preference) {
	.theme-toggle-icon {
		animation: themeToggleIconIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
}
```

Quando `prefers-reduced-motion: reduce` estiver ativo, a classe `.theme-toggle-icon` não recebe a regra `animation`, então o ícone troca sem animação (apenas o slide do thumb, que já usa `transition` do Tailwind e não é afetado por este bloco).

- **Step 6: Rodar a suíte completa do frontend para confirmar que nada quebrou**

Run: `pnpm --filter frontend test -- --run`
Expected: PASS — todos os testes do frontend passam, incluindo os 4 de `theme-toggle.test.tsx`.

- **Step 7: Commit**

```bash
git add apps/frontend/src/components/ui/theme-toggle.tsx apps/frontend/src/components/ui/theme-toggle.test.tsx apps/frontend/src/app/globals.css
git commit -m "feat(frontend): remove texto do theme toggle e anima troca de icone"
```

## Critérios de Sucesso

- O `ThemeToggle` não exibe mais os textos "Claro"/"Escuro" em nenhuma largura de tela.
- O pill do toggle é sempre compacto (~64px), sem lógica de breakpoint `max-[860px]` para o texto.
- O `aria-label` do botão continua descrevendo a ação disponível ("Ativar modo claro"/"Ativar modo escuro"), preservando acessibilidade para leitores de tela.
- O ícone (`Sun`/`Moon`) recebe uma transição leve (fade + rotate, ~200ms) ao trocar de tema, suprimida quando `prefers-reduced-motion: reduce` está ativo.
- `pnpm --filter frontend test -- --run` passa 100%, incluindo os 4 testes de `theme-toggle.test.tsx`.
- Verificação visual manual (via `pnpm --filter frontend dev`) confirma que o resultado corresponde à variante A aprovada no mockup (`../specs/mockups/theme-toggle-icon-only-visual.md`).
