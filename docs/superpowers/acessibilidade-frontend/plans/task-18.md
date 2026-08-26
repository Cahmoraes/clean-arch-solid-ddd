# Task 18: `search-bar` — rótulo acessível (com correção do bug de `aria-label` perdido) + anel de foco duplo [FR-001, FR-003]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

`SearchBar` (`apps/frontend/src/components/ui/search-bar.tsx`) tem dois problemas de nome acessível e um de contraste de foco:

1. **Bug confirmado:** no branch `onActivate && !compact` (linhas 48-66), o `<button>` renderizado não repassa nenhuma prop de `inputProps` (nem `aria-label`), então qualquer `aria-label` passado pelo consumidor é descartado. `authenticated-shell.tsx:291-297` passa `aria-label="Buscar"` ao primeiro `<SearchBar>` (o não-compacto, com `showShortcut`) e hoje esse valor se perde — o botão renderizado fica sem nome acessível.
2. No branch `<input>` cru (linhas 68-83), o input só recebe `placeholder`, sem `id`/`aria-label`/`<label>` associado. É consumido assim em `admin/usuarios/page.tsx:399-405`, que passa apenas `placeholder="Buscar por nome ou e-mail..."`, sem `aria-label` nem `<label>` — o input fica sem nome acessível.
3. O branch `<input>` cru usa `outline-none` (linha 74) sem substituto de foco visível.

Fix, inteiramente dentro de `search-bar.tsx` (nenhum call site precisa mudar — o mecanismo de fallback por `placeholder` cobre ambos os casos existentes):

- Extrair `"aria-label"` das props do componente (junto com o resto de `inputProps`) e calcular `const resolvedAriaLabel = ariaLabel ?? placeholder`.
- No branch `onActivate && !compact`, aplicar `aria-label={resolvedAriaLabel}` diretamente no `<button>`. **Não espalhar `{...inputProps}` no `<button>`** — `inputProps` é tipado a partir de `InputHTMLAttributes<HTMLInputElement>`, cujos manipuladores de evento (`onCopy`, `onChange` etc.) são genéricos em `HTMLInputElement` e não são atribuíveis a `ButtonHTMLAttributes<HTMLButtonElement>` (confirmado via `tsc --noEmit`: `Types of property 'onCopy' are incompatible`). Extrair apenas `aria-label` evita esse erro de tipo e é suficiente, já que nenhum consumidor atual passa outra prop de input a essa variante.
- No branch `<input>` cru, aplicar `aria-label={resolvedAriaLabel}` no `<input>` (mantendo o `{...inputProps}` já existente, que continua compatível pois o elemento é o mesmo tipo `HTMLInputElement`).
- Trocar `outline-none` por `focus-ring-duplo` no `<input>` do branch cru (linha 74, único ponto deste arquivo com override local de foco). Os branches `<button>` (`compact` e `onActivate && !compact`) não têm override local de foco hoje — continuam sem classe local, cobertos pelo token global `*:focus-visible` que a task-01 já migra para a mesma técnica de anel duplo (box-shadow), então nenhuma mudança é necessária neles para FR-003.

O branch `compact` (linhas 32-46) já tem `aria-label="Buscar"` hardcoded e não é afetado pelo bug — fora do escopo desta task.

## Arquivos

- Modify: `apps/frontend/src/components/ui/search-bar.tsx`
- Test: `apps/frontend/src/components/ui/search-bar.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: `SearchBar` é um componente de UI compartilhado com múltiplos branches condicionais (botão/input) — garantir que o padrão de props/acessibilidade seja consistente com os demais componentes shadcn do projeto.
- `tailwindcss`: troca de `outline-none` por `focus-ring-duplo` (utility Tailwind v4 criada na task-01).
- `wcag-audit-patterns`: correção de nome acessível (critério 4.1.2 Name, Role, Value) e contraste de indicador de foco (critério 1.4.11 / 2.4.7).
- `vercel-react-best-practices`: garantir que o fallback de `aria-label` não introduza re-renders desnecessários nem quebre a assinatura de props existente.
- `vercel-composition-patterns`: `SearchBarProps` estende `InputHTMLAttributes` via spread — o fix precisa preservar essa composição (props do consumidor sempre podem sobrescrever o fallback) sem duplicar branches condicionais.
- `test-antipatterns`: os testes novos devem exercitar o comportamento real (nome acessível resultante via `getByRole`), não a implementação interna (não testar que `inputProps` foi espalhado, e sim o resultado observável).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco do componente `SearchBar`? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code ou teste visual configurada — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Read the design source and fidelity tools already recorded in `### Fidelidade Visual` (the plan author discovered them once, at plan time). Confirm the original design source with the user — only this needs the user and so belongs at execution — and fill any gap the plan left open (re-run tool discovery only if the field was left blank, inspecting the available skills + connected MCP tools; match by capability, never hardcode a tool). If a source URL or a fidelity tool exists, use it; otherwise build to the curated mockup at `../specs/mockups/acessibilidade-frontend-visual.md` manually. The mockup is the *norte* — reuse its decided layout, spacing, and tokens; do not re-derive them.

- **Step 1: Write the failing tests**

```tsx
test("expõe aria-label no botão quando onActivate é fornecido com showShortcut (bug do aria-label perdido)", () => {
	render(
		<SearchBar
			showShortcut
			placeholder="Buscar..."
			aria-label="Buscar"
			onActivate={vi.fn()}
		/>,
	)
	expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument()
})

test("usa o placeholder como aria-label de fallback no botão quando onActivate é fornecido sem aria-label explícito", () => {
	render(<SearchBar placeholder="Buscar academia" onActivate={vi.fn()} />)
	expect(
		screen.getByRole("button", { name: "Buscar academia" }),
	).toBeInTheDocument()
})

test("usa o placeholder como aria-label de fallback no input cru quando não há aria-label explícito", () => {
	render(<SearchBar placeholder="Buscar academia" />)
	expect(
		screen.getByRole("textbox", { name: "Buscar academia" }),
	).toBeInTheDocument()
})

test("reforça o anel de foco duplo no input cru", () => {
	render(<SearchBar placeholder="Buscar..." />)
	expect(screen.getByRole("textbox")).toHaveClass("focus-ring-duplo")
})
```

- **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run src/components/ui/search-bar.test.tsx`
Expected: FAIL — os 4 testes novos falham (`getByRole("button", { name: "Buscar" })` não encontra elemento; `getByRole("button", { name: "Buscar academia" })` não encontra elemento; `getByRole("textbox", { name: "Buscar academia" })` não encontra elemento; `toHaveClass("focus-ring-duplo")` falha no input pois a classe ainda não existe).

- **Step 3: Write minimal implementation**

```tsx
"use client"

import { Search } from "lucide-react"
import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export interface SearchBarProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
	className?: string
	showShortcut?: boolean
	compact?: boolean
	/**
	 * When provided, renders as a keyboard-accessible button that triggers
	 * the Command Palette. The inner input is replaced with a decorative span.
	 */
	onActivate?: () => void
}

export function SearchBar({
	className,
	showShortcut = false,
	compact,
	onActivate,
	placeholder,
	"aria-label": ariaLabel,
	...inputProps
}: SearchBarProps) {
	const baseClasses = cn(
		"flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle",
		className,
	)
	const resolvedAriaLabel = ariaLabel ?? placeholder

	if (onActivate && compact) {
		return (
			<button
				type="button"
				onClick={onActivate}
				aria-label="Buscar"
				className={cn(
					"flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-md border border-border bg-surface text-subtle",
					className,
				)}
			>
				<Search className="h-4 w-4" aria-hidden="true" />
			</button>
		)
	}

	if (onActivate) {
		return (
			<button
				type="button"
				onClick={onActivate}
				aria-label={resolvedAriaLabel}
				className={cn(baseClasses, "cursor-pointer")}
			>
				<Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
				<span className="flex-1 truncate text-left text-[15px] text-subtle">
					{placeholder}
				</span>
				{showShortcut && (
					<kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-subtle">
						⌘K
					</kbd>
				)}
			</button>
		)
	}

	return (
		<div className={baseClasses}>
			<Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
			<input
				type="search"
				placeholder={placeholder}
				aria-label={resolvedAriaLabel}
				className="h-full flex-1 border-none bg-transparent text-[15px] text-foreground focus-ring-duplo placeholder:text-subtle"
				{...inputProps}
			/>
			{showShortcut && (
				<kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-subtle">
					⌘K
				</kbd>
			)}
		</div>
	)
}
```

- **Step 4: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run src/components/ui/search-bar.test.tsx`
Expected: PASS — todos os testes (os 5 existentes + os 4 novos) passam.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator
  commits at the integration barrier. If your prompt says you are one of several
  implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/components/ui/search-bar.tsx apps/frontend/src/components/ui/search-bar.test.tsx
git commit -m "fix: corrige aria-label perdido e anel de foco duplo em SearchBar"
```

## Critérios de Sucesso

- FR-001: o branch `onActivate && !compact` de `SearchBar` expõe nome acessível via `aria-label` explícito do consumidor quando fornecido, ou via fallback do `placeholder` quando não fornecido — confirmado por `getByRole("button", { name })` nos dois cenários.
- FR-001: o branch `<input>` cru de `SearchBar` expõe nome acessível via `aria-label` explícito do consumidor quando fornecido, ou via fallback do `placeholder` quando não fornecido — confirmado por `getByRole("textbox", { name })`.
- FR-003: o `<input>` do branch cru carrega a classe `focus-ring-duplo`, substituindo `outline-none` sem substituto.
- Nenhum call site (`authenticated-shell.tsx`, `admin/usuarios/page.tsx`) precisa de alteração — o fix é inteiramente local a `search-bar.tsx`.
- Os 5 testes pré-existentes em `search-bar.test.tsx` continuam passando sem modificação.
