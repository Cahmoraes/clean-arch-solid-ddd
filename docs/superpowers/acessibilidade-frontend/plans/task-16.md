# Task 16: `gym-location-picker` — indicador de obrigatoriedade + anel de foco duplo [FR-002, FR-003]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

O input de endereço em `AddressSearchInput` (dentro de `gym-location-picker.tsx`) marca obrigatoriedade só visualmente, com `<span className="text-red-500">*</span>` ao lado do label — sem `required`/`aria-required` no `<input>` e sem texto equivalente para leitor de tela. O mesmo `<input>` usa a técnica antiga de anel de foco (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`), que precisa migrar para a utility `focus-ring-duplo` criada pela task-01. O `*` visual existente é mantido como está (decisão de design: aqui já existe um asterisco custom fora do padrão `FormField`/`FieldShell`, e mantê-lo é aceitável — o essencial é complementar com `aria-required` + texto `sr-only`).

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-location-picker.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-location-picker.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: troca das classes de foco antigas (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`) pela utility Tailwind v4 `focus-ring-duplo` criada na task-01.
- `wcag-audit-patterns`: aplicação do padrão `aria-required` + texto `sr-only "(obrigatório)"` em campo de formulário obrigatório (critério 3.3.2 / 4.1.2 WCAG 2.2), preservando o indicador visual existente.
- `vercel-react-best-practices`: alteração de componente React (função `AddressSearchInput`) sem introduzir re-renders ou mudanças de contrato desnecessárias — só markup/atributos.
- `test-antipatterns`: teste novo deve validar comportamento observável (atributos ARIA, classe de foco) via Testing Library, sem acoplar a detalhes de implementação nem duplicar os testes `it(...)` já existentes.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/acessibilidade-frontend-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** Nenhuma — mockup gerado a partir dos tokens reais do projeto, comparado lado a lado no visual companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para o anel de foco do componente `gym-location-picker`? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobertas neste repositório):** nenhuma skill/MCP de design-to-code ou teste visual configurada — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** técnica de "anel duplo" (`box-shadow` de duas camadas — gap na cor de fundo + contorno escuro), validada visualmente com o usuário sobre um botão e um input reais, escolhida sobre "anel escuro sólido" por se adaptar melhor a fundos coloridos; ≥16:1 de contraste em qualquer fundo/tema, sem depender de `--color-ring`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual` acima (descobertas em tempo de planejamento). Confirmar com o usuário se existe uma fonte de design original (URL/export) para o anel de foco do input de endereço em `gym-location-picker`. Se não houver — como já indicado — implementar manualmente a partir do mockup curado em `../specs/mockups/acessibilidade-frontend-visual.md`, reaproveitando o layout/spacing/tokens já decididos, sem redesenhar a técnica de anel duplo.

- **Step 1: Write the failing test**

  Em `apps/frontend/src/features/gyms/components/gym-location-picker.test.tsx`, adicionar `test` (NUNCA `it`, conforme convenção do repositório) ao `describe("GymLocationPicker", ...)` existente. Como o arquivo hoje só importa `it` do pacote de testes, ajustar o import para incluir `test` também:

  ```tsx
  import { describe, expect, it, test, vi } from "vitest"
  ```

  Novo teste, adicionado ao final do bloco `describe`:

  ```tsx
  test("input de endereço é obrigatório, com aria-required e texto para leitor de tela", () => {
  	renderWithProviders(
  		<GymLocationPicker
  			value={{ address: "", latitude: 0, longitude: 0 }}
  			onChange={vi.fn()}
  		/>,
  	)
  	const input = screen.getByLabelText(/endereço completo/i)
  	expect(input).toHaveAttribute("aria-required", "true")
  	expect(screen.getByText("(obrigatório)")).toBeInTheDocument()
  	expect(input).toHaveClass("focus-ring-duplo")
  })
  ```

- **Step 2: Run test to verify it fails**

  Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-location-picker.test.tsx -t "input de endereço é obrigatório, com aria-required e texto para leitor de tela"`
  Expected: FAIL — `aria-required` ausente no input, texto `"(obrigatório)"` não encontrado, classe `focus-ring-duplo` ausente.

- **Step 3: Write minimal implementation**

  Em `apps/frontend/src/features/gyms/components/gym-location-picker.tsx`, dentro de `AddressSearchInput`:

  ```tsx
  return (
  	<div className="flex flex-col gap-1">
  		<label htmlFor={addressInputId} className="text-sm font-medium">
  			Endereço completo <span className="text-red-500">*</span>
  			<span className="sr-only">(obrigatório)</span>
  		</label>
  		<div className="flex gap-2">
  			<input
  				id={addressInputId}
  				data-testid="gym-location-address"
  				type="text"
  				required
  				aria-required="true"
  				value={address}
  				onChange={(e) => onAddressChange(e.target.value)}
  				onKeyDown={handleKeyDown}
  				placeholder="Ex.: Av. Paulista, 1578, São Paulo - SP"
  				className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-ring-duplo"
  			/>
  			<Button
  				type="button"
  				data-testid="gym-location-search"
  				variant="outline"
  				disabled={isSearching}
  				onClick={onSearchClick}
  			>
  				{isSearching ? "Buscando..." : "Buscar"}
  			</Button>
  		</div>
  		{searchError && <p className="text-sm text-destructive">{searchError}</p>}
  	</div>
  )
  ```

- **Step 4: Run test to verify it passes**

  Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-location-picker.test.tsx -t "input de endereço é obrigatório, com aria-required e texto para leitor de tela"`
  Expected: PASS

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração. Se o seu prompt indicar que você é um de vários implementadores num mesmo worktree, pule este passo e reporte os arquivos.)*

  ```bash
  git add apps/frontend/src/features/gyms/components/gym-location-picker.tsx apps/frontend/src/features/gyms/components/gym-location-picker.test.tsx
  git commit -m "fix(gyms): adiciona aria-required e anel de foco duplo ao input de endereço"
  ```

## Critérios de Sucesso

- O `<input id={addressInputId}>` em `AddressSearchInput` tem os atributos `required` e `aria-required="true"` (FR-002).
- O label do campo contém, além do `*` visual existente, um `<span className="sr-only">(obrigatório)</span>` perceptível por leitor de tela (FR-002).
- O `<input>` usa a classe `focus-ring-duplo` no lugar de `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FR-003).
- O novo teste `"input de endereço é obrigatório, com aria-required e texto para leitor de tela"` usa `test` (nunca `it`) e passa isoladamente via `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-location-picker.test.tsx -t "input de endereço é obrigatório, com aria-required e texto para leitor de tela"`.
- Os 6 testes `it(...)` já existentes em `gym-location-picker.test.tsx` continuam passando sem alteração de comportamento funcional do componente.
