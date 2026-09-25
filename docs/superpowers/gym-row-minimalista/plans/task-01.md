# Task 1: Indicador de status por ponto e limpeza da linha [FR-001, FR-002, FR-003, FR-004, FR-005, FR-010]

**Status:** PENDING

**PRD:** `../prd/prd-gym-row-minimalista.md`

**Spec:** `../specs/gym-row-minimalista-design.md`

**Tier:** standard

## Visão Geral

A linha da lista deixa de mostrar telefone, "Ver detalhes", o selo de texto de status e a pílula "Check-in". O status passa a ser um ponto colorido antes do nome, com o rótulo acessível ("Disponível" ou "Desativada"). O botão de editar existente permanece como está; os ícones de ação são tratados na task seguinte.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-row.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-row.test.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-results.test.tsx`

## Interfaces

- **Consome:** N/A
- **Produz:** `GymRow` (`{ gym: GymSummary; adminEditHref?: string }`, assinatura inalterada) sem selo, telefone e pílula, com `<span role="img" aria-label={label} title={label} data-testid="gym-row-status">` antes do título (`bg-success` para tom `success`, `bg-destructive` para tom `danger`), consumido pela task-02

### Skills a invocar

- `test-antipatterns`: reescrita dos testes do `GymRow`, evitando asserir sobre mocks e detalhe de implementação
- `tailwindcss`: classes do ponto de status por token (`bg-success`, `bg-destructive`)
- `wcag-audit-patterns`: nome acessível do indicador de status (elemento não textual com `role="img"`)
- `no-workarounds`: se o Biome apontar regra sobre o `role="img"`, corrigir na causa (ver Step 3), sem `biome-ignore`

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-row-minimalista-visual.md` (variante A: ponto de status 8px antes do nome, sem telefone, sem selo, sem pílula)
- **Fonte de design original:** screenshot da lista atual fornecido pelo usuário e mockup da variante A no companion
- **Confirmar com o usuário:** existe uma fonte de design original além do screenshot e do mockup curado?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** ponto de status 8px antes do nome (`bg-success` / `bg-destructive`); sem telefone, sem selo de texto, sem pílula; tema, fonte e tokens atuais mantidos

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Ler `### Fidelidade Visual` acima. Não há fonte de design além do mockup curado: construir a partir de `../specs/mockups/gym-row-minimalista-visual.md`. Este passo não bloqueia.

- **Step 1: Escrever os testes que falham**

Em `apps/frontend/src/features/gyms/components/gym-row.test.tsx`, remover os testes que asserem sobre elementos que deixam de existir (localizar pelos nomes): "exibe 'Ver detalhes' quando o telefone está ausente", "exibe o telefone quando presente", "exibe o pill de disponibilidade", "exibe o CTA de check-in", "o selo de status usa o StatusBadge compartilhado (com ícone semântico)", "o selo de status fica no canto superior direito da linha, sem ocupar coluna", "a linha realça no hover por token e a pílula Check-in é ciano" (preservar só a asserção `hover:bg-surface-2` do link da linha, movendo-a para um teste próprio), e reescrever os dois testes de "Desativada" abaixo. Adicionar, dentro do `describe` existente (o fixture `gym` e `renderWithProviders` já estão no arquivo):

```tsx
test("exibe imagem, nome, descrição e endereço da academia", () => {
	renderWithProviders(<GymRow gym={gym} />)
	expect(screen.getByText("VOLT Centro")).toBeInTheDocument()
	expect(screen.getByText("Academia completa")).toBeInTheDocument()
	expect(screen.getByText("Rua A, 100")).toBeInTheDocument()
})


test("não exibe selo de texto de status nem a pílula Check-in", () => {
	renderWithProviders(<GymRow gym={gym} />)
	expect(screen.queryByText("Disponível")).not.toBeInTheDocument()
	expect(screen.queryByText("Check-in")).not.toBeInTheDocument()
})

test("indica disponibilidade com ponto verde nomeado, antes do nome", () => {
	renderWithProviders(<GymRow gym={gym} />)
	const dot = screen.getByRole("img", { name: "Disponível" })
	expect(dot).toHaveAttribute("title", "Disponível")
	expect(dot).toHaveClass("bg-success")
	expect(screen.getByText("VOLT Centro")).toContainElement(dot)
})

test("indica 'Desativada' com ponto vermelho quando admin e status desativado", () => {
	const deactivatedGym: Gym = { ...gym, status: "deactivated" }
	renderWithProviders(
		<GymRow gym={deactivatedGym} adminEditHref="/admin/academias/g1/editar" />,
	)
	const dot = screen.getByRole("img", { name: "Desativada" })
	expect(dot).toHaveClass("bg-destructive")
	expect(screen.queryByRole("img", { name: "Disponível" })).not.toBeInTheDocument()
})


test("a linha realça no hover por token", () => {
	renderWithProviders(<GymRow gym={gym} />)
	expect(screen.getByTestId("gym-row-g1")).toHaveClass("hover:bg-surface-2")
})
```

Em `apps/frontend/src/features/gyms/components/gym-results.test.tsx`, localizar a asserção `expect(screen.getAllByText("Disponível")).toHaveLength(2)` (em torno da linha 166). Se o teste renderiza a visão em linhas, trocá-la por `expect(screen.getAllByRole("img", { name: "Disponível" })).toHaveLength(2)`; se renderiza a visão em grid (`GymCard`), deixá-la como está (o grid não muda).

- **Step 2: Review Focus: telefone preenchido ou ausente nunca aparece na linha — Write the failing test**

```tsx
test("não exibe telefone nem 'Ver detalhes', com ou sem telefone", () => {
	const { unmount } = renderWithProviders(
		<GymRow gym={{ ...gym, phone: "(11) 99999-0000" }} />,
	)
	expect(screen.queryByText("(11) 99999-0000")).not.toBeInTheDocument()
	expect(screen.queryByText("Ver detalhes")).not.toBeInTheDocument()
	unmount()
	renderWithProviders(<GymRow gym={{ ...gym, phone: null }} />)
	expect(screen.queryByText("Ver detalhes")).not.toBeInTheDocument()
})
```

- **Step 3: Review Focus: academia desativada sem `adminEditHref` segue indicada como disponível — Write the failing test**

```tsx
test("sem adminEditHref, mesmo desativada, indica 'Disponível'", () => {
	const deactivatedGym: Gym = { ...gym, status: "deactivated" }
	renderWithProviders(<GymRow gym={deactivatedGym} />)
	expect(screen.getByRole("img", { name: "Disponível" })).toHaveClass("bg-success")
	expect(screen.queryByRole("img", { name: "Desativada" })).not.toBeInTheDocument()
})
```

- **Step 4: Rodar os testes e verificar que falham**

Run: `cd apps/frontend && npx vitest run src/features/gyms/components/gym-row.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "img" and name "Disponível"` (o ponto ainda não existe) e o texto "Disponível"/telefone ainda presente nos testes de ausência.

- **Step 5: Implementar o mínimo**

Em `apps/frontend/src/features/gyms/components/gym-row.tsx`: remover o import de `StatusBadge`, remover o bloco `data-testid="gym-row-status"` com `StatusBadge`, remover o `<div className="flex flex-shrink-0 items-center gap-3">` inteiro (telefone, "Ver detalhes" e pílula "Check-in"), e trocar o parágrafo do título por:

```tsx
const STATUS_DOT_CLASS = {
	success: "bg-success",
	danger: "bg-destructive",
} as const

// dentro do componente, no lugar do <p> do título:
<p className="flex items-center gap-2 font-display text-[15px] text-card-foreground">
	<span
		role="img"
		aria-label={statusLabel}
		title={statusLabel}
		data-testid="gym-row-status"
		className={`h-2 w-2 flex-shrink-0 ${STATUS_DOT_CLASS[statusTone]}`}
	/>
	{gym.title}
</p>
```

`STATUS_DOT_CLASS` fica no nível do módulo, acima de `GymRow`. Não usar `rounded-full` (proibido em `src/`; o ponto é quadrado). Manter `resolveGymStatusBadge`, o link da linha, o `pr-14` do admin e o botão de editar exatamente como estão. Se o Biome apontar `useSemanticElements` para o `role="img"`, resolver na causa: trocar o `<span role="img" ...>` por `<span aria-hidden="true" title={statusLabel} data-testid="gym-row-status" className=... />` seguido de `<span className="sr-only">{statusLabel}</span>`, e ajustar os testes deste task para `getByTestId("gym-row-status")` (classe e `title`) e `getByText` restrito ao `sr-only`, mantendo a mesma cobertura.

- **Step 6: Rodar os testes e verificar que passam**

Run: `cd apps/frontend && npx vitest run src/features/gyms/components/gym-row.test.tsx`
Expected: PASS

Run: `cd apps/frontend && npx vitest run src/features/gyms/components/gym-results.test.tsx`
Expected: PASS

- **Step 7: Commit** *(somente quando `workflow.auto_commit` for true)*

```bash
git add apps/frontend/src/features/gyms/components/gym-row.tsx apps/frontend/src/features/gyms/components/gym-row.test.tsx apps/frontend/src/features/gyms/components/gym-results.test.tsx
git commit -m "feat(frontend): ponto de status e linha de academia sem telefone e selo"
```

## Critérios de Sucesso

- A linha exibe imagem, nome, descrição e endereço, e não exibe telefone, "Ver detalhes", selo de texto nem pílula (FR-001, FR-002, FR-003).
- Ponto verde antes do nome quando disponível e vermelho quando desativada, e "Desativada" só com `adminEditHref` (FR-004, FR-005).
- O ponto expõe "Disponível"/"Desativada" como nome acessível e como `title` (FR-010).
