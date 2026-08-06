# Task 2: `SearchBar`: variante `compact` (botão-ícone)

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/responsividade-mobile-admin-usuarios-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Abaixo de 560px o `SearchBar` completo some do header sem substituto, tornando o Command Palette inalcançável. Adiciona a prop `compact?: boolean` ao `SearchBar`: quando `true` (e `onActivate` fornecido), renderiza só um botão-ícone (lupa, ~38px, `rounded-md border border-border bg-surface`) que dispara o mesmo `onActivate` já usado pela variante completa — sem input, sem placeholder visível, sem atalho `⌘K`. Reaproveita a lógica existente em vez de criar um componente novo (D3 do spec).

## Arquivos

- Modify: `apps/frontend/src/components/ui/search-bar.tsx`
- Test: `apps/frontend/src/components/ui/search-bar.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: classes novas (`h-[38px] w-[38px]`, `rounded-md border border-border bg-surface`) seguem os tokens Tailwind v4 já usados no restante do componente.
- `shadcn`: o componente segue o padrão de props (`className` mesclável via `cn`, tokens de design como `bg-surface`/`border-border`) típico de shadcn/ui — a skill orienta a manter esse padrão na nova variante.
- `vercel-composition-patterns`: a prop `compact` é exatamente o caso de "boolean prop" que ramifica o render — a skill orienta como manter a ramificação legível (early return por variante) em vez de JSX condicional aninhado, especialmente com uma segunda prop booleana (`showShortcut`) já existente.
- `vercel-react-best-practices`: `SearchBar` é um Client Component (`"use client"`) que ramifica o JSX condicionalmente com base em props — a skill cobre padrões de componente client-side em apps Next.js.
- `test-antipatterns`: os novos testes devem consultar por papel/nome acessível (`getByRole("button", { name: ... })`) em vez de depender de detalhes de implementação (classes, estrutura DOM) — a skill orienta essa escolha.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/responsividade-mobile-admin-usuarios-visual.md` (seção "Header (<560px)") — baseline: botão `w-[38px] h-[38px] rounded-md border border-border bg-surface`, ícone de lupa, abre o Command Palette via `onActivate`.
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion visual desta sessão, a partir de screenshots reais do app.
- **Confirmar com o usuário:** não aplicável — spec e mockup já registram que não há fonte de design original (Figma/export); nada a confirmar além disso.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de design-to-code dedicada configurada neste repo; usar a skill `playwright-cli` (ou `claude-in-chrome`, se disponível na sessão) para abrir `pnpm --filter frontend dev` e conferir visualmente o botão-ícone — construção manual a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** botão só-ícone (lupa), ~38px, `rounded-md border border-border bg-surface`; reaproveita o `onActivate` já existente; sem input/placeholder/atalho `⌘K` visíveis nessa variante.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Releia a subseção `### Fidelidade Visual` acima. Não há fonte de design original a confirmar (já registrado no spec). Verifique se `playwright-cli` ou `claude-in-chrome` estão disponíveis nesta sessão; se nenhuma estiver, a verificação visual é feita rodando `pnpm --filter frontend dev` e inspecionando manualmente no navegador em largura ≤560px.

- **Step 1: Escrever os testes que falham**

Em `apps/frontend/src/components/ui/search-bar.test.tsx`, adicione dois testes ao `describe("SearchBar", ...)` existente:

```tsx
test("renderiza só o botão-ícone quando compact é true, mesmo com showShortcut", () => {
	render(
		<SearchBar compact showShortcut onActivate={vi.fn()} placeholder="buscar" />,
	)
	const button = screen.getByRole("button", { name: "Buscar" })
	expect(button).toBeInTheDocument()
	expect(screen.queryByText("buscar")).not.toBeInTheDocument()
	expect(screen.queryByText("⌘K")).not.toBeInTheDocument()
})

test("chama onActivate ao clicar no botão-ícone compacto", async () => {
	const onActivate = vi.fn()
	render(<SearchBar compact onActivate={onActivate} placeholder="buscar" />)
	await userEvent.click(screen.getByRole("button", { name: "Buscar" }))
	expect(onActivate).toHaveBeenCalledTimes(1)
})
```

- **Step 2: Rodar os testes para confirmar que falham**

Run: `pnpm --filter frontend exec vitest run src/components/ui/search-bar.test.tsx`
Expected: FAIL — os 2 novos testes falham com `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Buscar"`, porque sem a implementação o componente ignora `compact` e cai no branch `onActivate` atual, cujo botão expõe como nome acessível o texto visível "buscar ⌘K" (não "Buscar"); os 3 testes já existentes no arquivo continuam passando.

- **Step 3: Implementar a variante `compact`**

Substitua o conteúdo de `apps/frontend/src/components/ui/search-bar.tsx`:

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
	compact = false,
	onActivate,
	placeholder,
	...inputProps
}: SearchBarProps) {
	const baseClasses = cn(
		"flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle",
		className,
	)

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
				className="h-full flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
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

(Mudanças: adiciona `compact?: boolean` à interface e aos parâmetros; insere um novo branch `if (onActivate && compact)` antes do branch `if (onActivate)` existente; nada mais no arquivo muda.)

- **Step 4: Rodar os testes para confirmar que passam**

Run: `pnpm --filter frontend exec vitest run src/components/ui/search-bar.test.tsx`
Expected: PASS — os 5 testes do arquivo passam.

- **Step 5: Commit**

```bash
git add apps/frontend/src/components/ui/search-bar.tsx apps/frontend/src/components/ui/search-bar.test.tsx
git commit -m "feat(frontend): adiciona variante compact ao SearchBar"
```

## Critérios de Sucesso

- `SearchBar` aceita a prop `compact?: boolean`.
- Com `compact` e `onActivate`, renderiza só o botão-ícone (lupa, ~38px), sem input/placeholder/atalho `⌘K` visíveis.
- O clique no botão-ícone compacto dispara `onActivate` (o mesmo callback que abre o Command Palette na variante completa).
- Sem `compact`, o comportamento existente (input livre, ou botão com placeholder/atalho quando `onActivate` é passado) permanece idêntico.
- `pnpm --filter frontend exec vitest run src/components/ui/search-bar.test.tsx` passa com os 5 testes do arquivo.
