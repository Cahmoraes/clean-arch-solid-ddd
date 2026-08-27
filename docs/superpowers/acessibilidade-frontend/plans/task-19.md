# Task 19: `command-palette` — anel de foco duplo no campo de busca e no container [FR-003]

**Status:** DONE
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

`CommandPalette` (`apps/frontend/src/components/command-palette/command-palette.tsx`) tem dois elementos com foco sem indicador visível substituto:

1. `Content` do Radix Dialog (linha 33) tem `focus:outline-none` na `className`, sem substituto.
2. `Command.Input` (linhas 46-51) tem `outline-none` na `className`, sem substituto — é o alvo de foco funcional real (onde o usuário digita a busca).

Fix: trocar `focus:outline-none` (em `Content`) e `outline-none` (em `Command.Input`) pela utility `focus-ring-duplo` criada na task-01, preservando o restante das classes existentes. Nenhum achado de rótulo/nome acessível neste arquivo — a migração de rótulo programático não se aplica aqui: `Title` já é `sr-only` e `Command.Input` já tem `placeholder` descritivo.

## Arquivos

- Modify: `apps/frontend/src/components/command-palette/command-palette.tsx`
- Test: `apps/frontend/src/components/command-palette/command-palette.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: `CommandPalette` compõe primitivas Radix (`Dialog`) com `cmdk` (`Command`) — a troca de classes de foco deve seguir o padrão de composição já usado no arquivo (className concatenada em template/`className` direto, sem `cn()` neste componente).
- `tailwindcss`: troca de `focus:outline-none`/`outline-none` por `focus-ring-duplo` (utility Tailwind v4 criada na task-01).
- `wcag-audit-patterns`: correção de contraste de indicador de foco (critérios 1.4.11 Non-text Contrast e 2.4.7 Focus Visible) no container do diálogo e no campo de busca real.
- `vercel-react-best-practices`: garantir que a troca de classes não introduza remounts ou efeitos colaterais no componente controlado (`open`/`onOpenChange`).
- `test-antipatterns`: os testes novos devem verificar o resultado observável (classe aplicada ao elemento renderizado via `getByRole`), sem mockar `cmdk`/Radix nem testar detalhes internos dessas bibliotecas.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco do componente `CommandPalette`? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code ou teste visual configurada — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Read the design source and fidelity tools already recorded in `### Fidelidade Visual` (the plan author discovered them once, at plan time). Confirm the original design source with the user — only this needs the user and so belongs at execution — and fill any gap the plan left open (re-run tool discovery only if the field was left blank, inspecting the available skills + connected MCP tools; match by capability, never hardcode a tool). If a source URL or a fidelity tool exists, use it; otherwise build to the curated mockup at `../specs/mockups/acessibilidade-frontend-visual.md` manually. The mockup is the *norte* — reuse its decided layout, spacing, and tokens; do not re-derive them.

- **Step 1: Write the failing tests**

`CommandPalette` já é controlado via prop `open` (sem atalho de teclado interno) — o padrão de abertura em `command-palette.test.tsx` é `renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)`. `Content` do Radix Dialog renderiza com `role="dialog"` por padrão (confirmado em `@radix-ui/react-dialog`), então é testável via `getByRole("dialog")`. `Command.Input` é testável via `getByPlaceholderText`, já usado nos testes existentes deste arquivo.

```tsx
test("reforça o anel de foco duplo no container do diálogo", () => {
	renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
	expect(screen.getByRole("dialog")).toHaveClass("focus-ring-duplo")
})

test("reforça o anel de foco duplo no campo de busca", () => {
	renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
	expect(
		screen.getByPlaceholderText("Buscar páginas, academias, usuários..."),
	).toHaveClass("focus-ring-duplo")
})
```

- **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run src/components/command-palette/command-palette.test.tsx`
Expected: FAIL — os 2 testes novos falham com `toHaveClass("focus-ring-duplo")` recebendo `false` (o container ainda usa `focus:outline-none` e o input ainda usa `outline-none`).

- **Step 3: Write minimal implementation**

```tsx
"use client"

import { Content, Overlay, Portal, Root, Title } from "@radix-ui/react-dialog"
import { Command } from "cmdk"
import { Search } from "lucide-react"
import { useState } from "react"
import { useAuthStore } from "@/lib/auth/auth-store"
import { GymGroup } from "./gym-group"
import { NavigationGroup } from "./navigation-group"
import { useGlobalSearch } from "./use-global-search"
import { UserGroup } from "./user-group"

interface CommandPaletteProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const [query, setQuery] = useState("")
	const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN")
	const { debouncedQuery, isActive } = useGlobalSearch(query)

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) setQuery("")
		onOpenChange(nextOpen)
	}

	return (
		<Root open={open} onOpenChange={handleOpenChange}>
			<Portal>
				<Overlay className="fixed inset-0 z-40 bg-black/60" />
				<Content
					className="fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-pop focus-ring-duplo"
					aria-describedby={undefined}
				>
					<Title className="sr-only">Paleta de comandos</Title>
					<Command
						shouldFilter={false}
						className="flex flex-col font-mono [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-subtle"
					>
						<div className="flex items-center gap-3 border-b border-border px-4">
							<Search
								className="h-4 w-4 shrink-0 text-subtle"
								aria-hidden="true"
							/>
							<Command.Input
								value={query}
								onValueChange={setQuery}
								placeholder="Buscar páginas, academias, usuários..."
								className="flex h-12 w-full bg-transparent py-3 text-sm text-foreground placeholder:text-subtle focus-ring-duplo"
							/>
						</div>
						<Command.List className="max-h-[400px] overflow-y-auto py-2">
							<Command.Empty className="py-8 text-center text-sm text-subtle">
								Nenhum resultado encontrado.
							</Command.Empty>

							<NavigationGroup
								query={query}
								onSelect={() => handleOpenChange(false)}
							/>

							<GymGroup
								query={debouncedQuery}
								isActive={isActive}
								onSelect={() => handleOpenChange(false)}
							/>

							{isAdmin && (
								<UserGroup
									query={debouncedQuery}
									isActive={isActive}
									onSelect={() => handleOpenChange(false)}
								/>
							)}
						</Command.List>
					</Command>
				</Content>
			</Portal>
		</Root>
	)
}
```

- **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run src/components/command-palette/command-palette.test.tsx`
Expected: PASS — todos os testes (os 8 existentes + os 2 novos) passam.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator
  commits at the integration barrier. If your prompt says you are one of several
  implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/components/command-palette/command-palette.tsx apps/frontend/src/components/command-palette/command-palette.test.tsx
git commit -m "fix: aplica anel de foco duplo no container e no input da CommandPalette"
```

## Critérios de Sucesso

- FR-003: o `Content` do Radix Dialog em `CommandPalette` carrega a classe `focus-ring-duplo`, substituindo `focus:outline-none` sem substituto — confirmado por `getByRole("dialog")`.
- FR-003: o `Command.Input` em `CommandPalette` carrega a classe `focus-ring-duplo`, substituindo `outline-none` sem substituto — confirmado por `getByPlaceholderText`.
- Nenhuma mudança de comportamento funcional (abertura/fechamento via `open`/`onOpenChange`, busca, `Esc`, grupos de resultado) — os 8 testes pré-existentes em `command-palette.test.tsx` continuam passando sem modificação.
