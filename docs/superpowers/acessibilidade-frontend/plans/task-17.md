# Task 17: `check-in-search-input` — rótulo acessível + anel de foco duplo + alvo de toque do botão "Limpar" [FR-001, FR-003, FR-008]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

`CheckInSearchInput` renderiza um `<input type="text">` sem `aria-label`/`<label>` associado — só `placeholder`, que não é um substituto válido de nome acessível — e usa `outline-none` sem nenhum substituto de foco visível. O botão "Limpar busca" já tem `aria-label="Limpar busca"`, mas herda o tamanho do ícone `X` (`h-4 w-4`, 16×16px), abaixo do alvo mínimo de toque de 24×24px exigido pelo critério 2.5.8. Esta task adiciona uma prop `label` obrigatória ao componente (aplicada como `aria-label` no input), troca `outline-none` pela utility `focus-ring-duplo` (criada na task-01) e amplia a área clicável do botão "Limpar busca" para 24×24px sem alterar o tamanho visual do ícone. Como `label` passa a ser prop obrigatória, os dois call sites (`check-ins/page.tsx` e `admin/check-ins/page.tsx`) são atualizados no mesmo diff.

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`
- Test: `apps/frontend/src/features/check-ins/components/check-in-search-input.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: troca de `outline-none` pela utility Tailwind v4 `focus-ring-duplo` (task-01) e composição das classes `inline-flex h-6 w-6 items-center justify-center` para o alvo de toque do botão "Limpar busca".
- `wcag-audit-patterns`: nome acessível via `aria-label` (critério 4.1.2/1.3.1 — rótulo programático) e alvo de toque mínimo de 24×24px (critério 2.5.8) no botão ícone-only.
- `vercel-react-best-practices`: adição de prop obrigatória em componente de UI reutilizado por 2 call sites — contrato de props tipado explicitamente, sem quebrar comportamento existente.
- `test-antipatterns`: os testes novos/atualizados verificam comportamento observável (role/nome acessível, classes de foco/tamanho) via Testing Library, sem depender de detalhes internos de implementação.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco do componente `check-in-search-input`? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code ou teste visual configurada — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual` acima (descobertas em tempo de planejamento). Confirmar com o usuário se existe uma fonte de design original (URL/export) para o anel de foco do `CheckInSearchInput` e para o alvo de toque do botão "Limpar busca". Se não houver — como já indicado — implementar manualmente a partir do mockup curado em `../specs/mockups/acessibilidade-frontend-visual.md`, reaproveitando o layout/spacing/tokens já decididos, sem redesenhar a técnica de anel duplo.

- **Step 1: Write the failing test**

  Em `apps/frontend/src/features/check-ins/components/check-in-search-input.test.tsx`, todos os `render(<CheckInSearchInput ... />)` existentes ganham a nova prop obrigatória `label="Buscar check-in por academia"` (o componente deixará de compilar sem ela), e 3 testes novos são adicionados ao final do `describe`:

  ```tsx
  import { render, screen } from "@testing-library/react"
  import userEvent from "@testing-library/user-event"
  import { describe, expect, test, vi } from "vitest"
  import { CheckInSearchInput } from "./check-in-search-input"

  describe("CheckInSearchInput", () => {
  	test("renderiza o campo de busca com placeholder", () => {
  		render(
  			<CheckInSearchInput
  				value=""
  				onChange={vi.fn()}
  				placeholder="Buscar academia..."
  				label="Buscar check-in por academia"
  			/>,
  		)
  		expect(
  			screen.getByPlaceholderText("Buscar academia..."),
  		).toBeInTheDocument()
  	})

  	test("exibe o valor atual no input", () => {
  		render(
  			<CheckInSearchInput
  				value="SmartFit"
  				onChange={vi.fn()}
  				placeholder="Buscar academia..."
  				label="Buscar check-in por academia"
  			/>,
  		)
  		expect(screen.getByDisplayValue("SmartFit")).toBeInTheDocument()
  	})

  	test("chama onChange ao digitar", async () => {
  		const onChange = vi.fn()
  		render(
  			<CheckInSearchInput
  				value=""
  				onChange={onChange}
  				placeholder="Buscar academia..."
  				label="Buscar check-in por academia"
  			/>,
  		)
  		await userEvent.type(screen.getByPlaceholderText("Buscar academia..."), "a")
  		expect(onChange).toHaveBeenCalled()
  	})

  	test("exibe botão de limpar quando há valor e chama onChange com vazio ao clicar", async () => {
  		const onChange = vi.fn()
  		render(
  			<CheckInSearchInput
  				value="SmartFit"
  				onChange={onChange}
  				placeholder="Buscar academia..."
  				label="Buscar check-in por academia"
  			/>,
  		)
  		const clearButton = screen.getByRole("button", { name: /limpar busca/i })
  		expect(clearButton).toBeInTheDocument()
  		await userEvent.click(clearButton)
  		expect(onChange).toHaveBeenCalledWith("")
  	})

  	test("não exibe botão de limpar quando valor está vazio", () => {
  		render(
  			<CheckInSearchInput
  				value=""
  				onChange={vi.fn()}
  				placeholder="Buscar academia..."
  				label="Buscar check-in por academia"
  			/>,
  		)
  		expect(
  			screen.queryByRole("button", { name: /limpar busca/i }),
  		).not.toBeInTheDocument()
  	})

  	test("expõe rótulo acessível via prop label", () => {
  		render(
  			<CheckInSearchInput
  				value=""
  				onChange={vi.fn()}
  				placeholder="Buscar academia..."
  				label="Buscar check-in por academia"
  			/>,
  		)
  		expect(
  			screen.getByRole("textbox", { name: "Buscar check-in por academia" }),
  		).toBeInTheDocument()
  	})

  	test("reforça o anel de foco (contraste) no input", () => {
  		render(
  			<CheckInSearchInput
  				value=""
  				onChange={vi.fn()}
  				placeholder="Buscar academia..."
  				label="Buscar check-in por academia"
  			/>,
  		)
  		expect(
  			screen.getByRole("textbox", { name: "Buscar check-in por academia" }),
  		).toHaveClass("focus-ring-duplo")
  	})

  	test("botão limpar busca atinge o alvo mínimo de toque (24x24px)", () => {
  		render(
  			<CheckInSearchInput
  				value="SmartFit"
  				onChange={vi.fn()}
  				placeholder="Buscar academia..."
  				label="Buscar check-in por academia"
  			/>,
  		)
  		const clearButton = screen.getByRole("button", { name: /limpar busca/i })
  		expect(clearButton).toHaveClass("h-6")
  		expect(clearButton).toHaveClass("w-6")
  	})
  })
  ```

- **Step 2: Run test to verify it fails**

  Run: `pnpm --filter frontend exec vitest run src/features/check-ins/components/check-in-search-input.test.tsx -t "expõe rótulo acessível via prop label"`
  Expected: FAIL — `getByRole("textbox", { name: "Buscar check-in por academia" })` não encontra elemento (input não tem `aria-label`/nome acessível). Rodar também com `-t "reforça o anel de foco"` e `-t "botão limpar busca atinge o alvo mínimo"`: ambos FAIL (classe `focus-ring-duplo` ausente; classes `h-6`/`w-6` ausentes no botão).

- **Step 3: Write minimal implementation**

  Em `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx`:

  ```tsx
  import { Search, X } from "lucide-react"
  import { cn } from "@/lib/cn"

  export interface CheckInSearchInputProps {
  	value: string
  	onChange: (value: string) => void
  	label: string
  	placeholder?: string
  	className?: string
  }

  export function CheckInSearchInput({
  	value,
  	onChange,
  	label,
  	placeholder,
  	className,
  }: CheckInSearchInputProps) {
  	return (
  		<div
  			className={cn(
  				"relative flex w-full h-[52px] items-center rounded-md border border-border bg-surface px-4 gap-2",
  				className,
  			)}
  		>
  			<Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
  			<input
  				type="text"
  				value={value}
  				onChange={(e) => onChange(e.target.value)}
  				placeholder={placeholder}
  				aria-label={label}
  				className="flex-1 bg-transparent text-foreground placeholder:text-subtle focus-ring-duplo text-sm"
  			/>
  			{value && (
  				<button
  					type="button"
  					aria-label="Limpar busca"
  					onClick={() => onChange("")}
  					className="inline-flex h-6 w-6 items-center justify-center shrink-0 text-subtle hover:text-foreground transition-colors"
  				>
  					<X className="h-4 w-4" aria-hidden="true" />
  				</button>
  			)}
  		</div>
  	)
  }
  ```

  Em `apps/frontend/src/app/(authenticated)/check-ins/page.tsx` (por volta da L184), adicionar a nova prop obrigatória:

  ```tsx
  <CheckInSearchInput
  	value={gymNameInput}
  	onChange={setGymNameInput}
  	placeholder="Buscar por academia..."
  	label="Buscar check-in por academia"
  	className="flex-1"
  />
  ```

  Em `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx` (por volta da L161), o mesmo ajuste:

  ```tsx
  <CheckInSearchInput
  	value={gymNameInput}
  	onChange={setGymNameInput}
  	placeholder="Buscar por academia..."
  	label="Buscar check-in por academia"
  	className="flex-1"
  />
  ```

- **Step 4: Run test to verify it passes**

  Run: `pnpm --filter frontend exec vitest run src/features/check-ins/components/check-in-search-input.test.tsx`
  Expected: PASS — todos os 8 testes do arquivo (5 já existentes + 3 novos) passam.

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração. Se o seu prompt indicar que você é um de vários implementadores num mesmo worktree, pule este passo e reporte os arquivos.)*

  ```bash
  git add apps/frontend/src/features/check-ins/components/check-in-search-input.tsx apps/frontend/src/features/check-ins/components/check-in-search-input.test.tsx "apps/frontend/src/app/(authenticated)/check-ins/page.tsx" "apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx"
  git commit -m "fix(check-ins): adiciona rotulo acessivel, anel de foco duplo e alvo de toque ao campo de busca"
  ```

## Critérios de Sucesso

- `CheckInSearchInputProps` exige a prop `label: string`, aplicada como `aria-label={label}` no `<input>` — `screen.getByRole("textbox", { name: "..." })` encontra o campo pelo rótulo (FR-001).
- O `<input>` usa a classe `focus-ring-duplo` no lugar de `outline-none` (FR-003).
- O botão "Limpar busca" tem classes `h-6 w-6` (24×24px), acima do alvo mínimo de 24×24px do critério 2.5.8, sem alterar o tamanho visual do ícone `X` (`h-4 w-4`) (FR-008).
- Os 2 call sites (`check-ins/page.tsx` e `admin/check-ins/page.tsx`) passam `label="Buscar check-in por academia"` para `CheckInSearchInput` no mesmo diff.
- Os 5 testes já existentes em `check-in-search-input.test.tsx` continuam passando, e os 3 novos testes (`test`, nunca `it`) cobrindo rótulo acessível, anel de foco e alvo de toque passam isoladamente via `pnpm --filter frontend exec vitest run src/features/check-ins/components/check-in-search-input.test.tsx -t "expõe rótulo acessível via prop label"` (e equivalente para os outros dois nomes de teste).
