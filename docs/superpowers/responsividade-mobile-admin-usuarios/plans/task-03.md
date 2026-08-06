# Task 3: `ThemeToggle`: variante `compact` (botão redondo)

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/responsividade-mobile-admin-usuarios-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Para caber um ícone de busca no header em telas pequenas, o `ThemeToggle` (hoje um pill `w-16 h-[38px]` com thumb deslizante) ganha uma prop `compact?: boolean`: quando `true`, renderiza um botão redondo (~36px, `rounded-full bg-accent`) com o ícone sol/lua do tema atual, mesma lógica `useTheme`/`setTheme`, sem o trilho/pill deslizante nem posições esquerda/direita. Reaproveita a lógica existente em vez de criar um componente novo (D3 do spec).

## Arquivos

- Modify: `apps/frontend/src/components/ui/theme-toggle.tsx`
- Test: `apps/frontend/src/components/ui/theme-toggle.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: classes novas (`h-9 w-9 rounded-full bg-accent text-accent-foreground`) seguem os tokens Tailwind v4 já usados no restante do componente (o thumb da variante completa já usa `bg-accent text-accent-foreground`).
- `shadcn`: o botão redondo usa diretamente os tokens de design `bg-accent`/`text-accent-foreground` do design system do projeto — a skill cobre convenções de design tokens ao estender um componente existente.
- `vercel-composition-patterns`: a prop `compact` é o mesmo caso de "boolean prop" que ramifica o render tratado no `SearchBar` — a skill orienta a manter a ramificação (early return por variante) legível em vez de JSX condicional aninhado.
- `vercel-react-best-practices`: `ThemeToggle` é um Client Component (`"use client"`) que consome `useTheme`/`setTheme` de `next-themes` — a skill cobre padrões de componente client-side com hooks de terceiros em apps Next.js.
- `test-antipatterns`: os novos testes reaproveitam o mock existente de `next-themes` e consultam por papel/nome acessível (`getByRole("button", { name: ... })`) — a skill orienta a evitar testes acoplados a detalhes de implementação.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/responsividade-mobile-admin-usuarios-visual.md` (seção "Header (<560px)") — baseline: `w-9 h-9 rounded-full bg-accent text-accent-foreground`, ícone único sol/lua, sem thumb.
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion visual desta sessão, a partir de screenshots reais do app.
- **Confirmar com o usuário:** não aplicável — spec e mockup já registram que não há fonte de design original (Figma/export); nada a confirmar além disso.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de design-to-code dedicada configurada neste repo; usar a skill `playwright-cli` (ou `claude-in-chrome`, se disponível na sessão) para abrir `pnpm --filter frontend dev` e conferir visualmente o botão redondo — construção manual a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** botão redondo (~36px), `rounded-full`, fundo `--color-accent`/`--color-accent-foreground` (tokens já usados no thumb da variante completa), ícone único (sem thumb/trilho, sem posições esquerda/direita), mesma lógica `useTheme`/`setTheme` da variante completa.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Releia a subseção `### Fidelidade Visual` acima. Não há fonte de design original a confirmar (já registrado no spec). Verifique se `playwright-cli` ou `claude-in-chrome` estão disponíveis nesta sessão; se nenhuma estiver, a verificação visual é feita rodando `pnpm --filter frontend dev` e inspecionando manualmente no navegador em largura ≤560px.

- **Step 1: Escrever os testes que falham**

Em `apps/frontend/src/components/ui/theme-toggle.test.tsx`, adicione três testes ao `describe("ThemeToggle", ...)` existente:

```tsx
test("compact: renderiza botão redondo (~36px) sem trilho/pill deslizante", () => {
	render(<ThemeToggle compact />)
	const button = screen.getByRole("button", { name: /modo/i })
	expect(button.className).toContain("rounded-full")
	expect(button.className).toContain("h-9")
	expect(button.className).toContain("w-9")
	expect(button.className).not.toContain("w-16")
})

test("compact: alterna tema no clique", () => {
	render(<ThemeToggle compact />)
	fireEvent.click(screen.getByRole("button", { name: /modo/i }))
	expect(setTheme).toHaveBeenCalledWith("light")
})

test("compact: aria-label reflete o estado, igual à variante completa", () => {
	currentTheme = "light"
	render(<ThemeToggle compact />)
	expect(
		screen.getByRole("button", { name: "Ativar modo escuro" }),
	).toBeInTheDocument()
})
```

- **Step 2: Rodar os testes para confirmar que falham**

Run: `pnpm --filter frontend exec vitest run src/components/ui/theme-toggle.test.tsx`
Expected: FAIL — o teste "compact: renderiza botão redondo..." falha porque sem a implementação o componente ignora `compact` e continua renderizando o pill `w-16` (`expect(button.className).toContain("h-9")` e `.toContain("w-9")` falham, `.not.toContain("w-16")` também falha); os testes "compact: alterna tema..." e "compact: aria-label reflete o estado..." passam mesmo antes da implementação, pois `compact` sendo ignorado ainda cai na variante completa com o mesmo `onClick`/`aria-label`. Os 4 testes já existentes no arquivo continuam passando.

- **Step 3: Implementar a variante `compact`**

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
	compact?: boolean
}

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
	const { theme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) return null

	const isDark = theme === "dark"
	const { next, ariaLabel, pillLeft, Icon } =
		THEME_CONFIG[isDark ? "dark" : "light"]

	if (compact) {
		return (
			<button
				type="button"
				onClick={() => setTheme(next)}
				aria-label={ariaLabel}
				aria-pressed={isDark}
				className={cn(
					"inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground",
					className,
				)}
			>
				<Icon
					key={isDark ? "moon" : "sun"}
					className="h-4 w-4 flex-shrink-0"
					aria-hidden="true"
				/>
			</button>
		)
	}

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

(Mudanças: adiciona `compact?: boolean` à interface e aos parâmetros; insere um novo branch `if (compact)` com early return antes do `return` da variante completa; nada mais no arquivo muda.)

- **Step 4: Rodar os testes para confirmar que passam**

Run: `pnpm --filter frontend exec vitest run src/components/ui/theme-toggle.test.tsx`
Expected: PASS — os 7 testes do arquivo passam.

- **Step 5: Commit**

```bash
git add apps/frontend/src/components/ui/theme-toggle.tsx apps/frontend/src/components/ui/theme-toggle.test.tsx
git commit -m "feat(frontend): adiciona variante compact ao ThemeToggle"
```

## Critérios de Sucesso

- `ThemeToggle` aceita a prop `compact?: boolean`.
- Com `compact`, renderiza um botão redondo (~36px), sem trilho/pill deslizante nem posições esquerda/direita.
- O clique no botão compacto alterna o tema (`setTheme`) exatamente como a variante completa.
- O `aria-label` da variante compacta reflete o estado do tema do mesmo jeito que a variante completa.
- Sem `compact`, o comportamento existente (pill deslizante) permanece idêntico.
- `pnpm --filter frontend exec vitest run src/components/ui/theme-toggle.test.tsx` passa com os 7 testes do arquivo.
