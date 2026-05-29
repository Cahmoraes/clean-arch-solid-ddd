# Task 2: Filtro de check-ins em largura total

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/frontend-ui-adjustments-design.md`
**Depends on:** N/A

## Visão Geral

O `SegmentedControl` do filtro de check-ins usa `w-fit` por padrão e fica menor que a linha disponível. Passar `className="w-full [&>button]:flex-1 [&>button]:justify-center"` faz o componente ocupar 100% da largura do container e distribui os quatro botões (Todos / Pendentes / Aprovados / Rejeitados) em espaços iguais. A mudança afeta ambas as páginas que usam `CheckInFilterBar` (`/check-ins` e `/admin/check-ins`).

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`
- Test: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`

### Conformidade com as Skills Padrão

- code-style: convenções de componentes React, Tailwind
- no-workarounds: sem suprimir erros de lint

## Passos

- [ ] **Step 1: Escrever o teste que vai falhar**

Adicione o teste abaixo em `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`, dentro do `describe` existente:

```tsx
it("aplica classe w-full ao fieldset do SegmentedControl", () => {
  const { container } = render(
    <CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />,
  )
  const fieldset = container.querySelector("fieldset")
  expect(fieldset?.className).toContain("w-full")
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose -t "aplica classe w-full"
```

Esperado: FAIL — `expected "" to contain "w-full"` (o fieldset tem `w-fit` por padrão)

- [ ] **Step 3: Implementar a mudança em check-in-filter-bar.tsx**

Arquivo: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`

Localizar:
```tsx
	return (
		<SegmentedControl
			aria-label="Filtrar check-ins por status"
			items={ITEMS}
			value={toFilterValue(status)}
			onValueChange={(value) => onStatusChange(toStatus(value))}
		/>
	)
```

Substituir por:
```tsx
	return (
		<SegmentedControl
			aria-label="Filtrar check-ins por status"
			items={ITEMS}
			value={toFilterValue(status)}
			onValueChange={(value) => onStatusChange(toStatus(value))}
			className="w-full [&>button]:flex-1 [&>button]:justify-center"
		/>
	)
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose -t "aplica classe w-full"
```

Esperado: PASS

- [ ] **Step 5: Rodar a suite completa do componente**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose check-in-filter-bar
```

Esperado: todos os testes PASS (interação dos botões não é afetada pela mudança de largura)

- [ ] **Step 6: Lint + type check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros em ambos

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx \
        apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx
git commit -m "feat(frontend): expande filtro de check-ins para largura total

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `SegmentedControl` ocupa 100% da largura disponível na seção
- Os quatro botões (Todos, Pendentes, Aprovados, Rejeitados) ficam com largura igual
- Todos os testes de interação do filtro continuam passando
- Novo teste `fieldset?.className contains "w-full"` passa
