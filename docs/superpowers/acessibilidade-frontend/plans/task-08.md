# Task 8: `at-risk-alert-zone` — ícones decorativos ocultos de leitores de tela [FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`AtRiskAlertZone` (`apps/frontend/src/features/admin/analytics/components/at-risk-alert-zone.tsx`) renderiza dois ícones puramente decorativos — `CheckCircle2` no estado "academia saudável" (nenhum membro em risco) e `AlertTriangle` no estado "membros em risco" — sem `aria-hidden`. Em ambos os casos a informação que o ícone reforça visualmente já está disponível como texto adjacente ("Academia saudável" / a contagem de membros em risco), então leitores de tela não devem anunciar o ícone como conteúdo próprio. A task adiciona `aria-hidden="true"` aos dois ícones.

## Arquivos

- Modify: `apps/frontend/src/features/admin/analytics/components/at-risk-alert-zone.tsx`
- Test: `apps/frontend/src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx`

### Conformidade com as Skills Padrão

- `wcag-audit-patterns`: ícone decorativo redundante ao texto adjacente deve ser ocultado de leitores de tela via `aria-hidden="true"` (critério 1.1.1/4.1.2) — é exatamente o padrão desta correção.
- `vercel-react-best-practices`: a mudança é uma prop estática em componente de apresentação já existente; nenhuma lógica de renderização/estado muda, então a implementação deve permanecer mínima e não introduzir re-renders ou memoização desnecessária.
- `test-antipatterns`: o teste deve exercitar o componente real nos dois estados (props públicas `members`/`isLoading`), sem mockar `lucide-react` nem inspecionar detalhes de implementação além do atributo ARIA observável.

## Passos

- **Step 1: Write the failing test**

Adicionar os dois testes abaixo dentro do `describe("AtRiskAlertZone", () => { ... })` já existente em `apps/frontend/src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx` (o array `fourMembers` já está declarado no escopo do módulo, reutilizar diretamente):

```tsx
test("oculta o ícone de 'academia saudável' de leitores de tela", () => {
	const { container } = render(
		<AtRiskAlertZone members={[]} isLoading={false} />,
	)
	const icon = container.querySelector("svg")
	expect(icon).toHaveAttribute("aria-hidden", "true")
})

test("oculta o ícone de alerta de membros em risco de leitores de tela", () => {
	const { container } = render(
		<AtRiskAlertZone members={fourMembers} isLoading={false} />,
	)
	const icon = container.querySelector("svg")
	expect(icon).toHaveAttribute("aria-hidden", "true")
})
```

- **Step 2: Run test to verify it fails**

Run (a partir da raiz do monorepo): `pnpm --filter frontend exec vitest run src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx`
Expected: FAIL — os dois novos testes falham porque o `<svg>` renderizado (`CheckCircle2` no estado vazio, `AlertTriangle` no estado com membros) não possui o atributo `aria-hidden`.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/admin/analytics/components/at-risk-alert-zone.tsx`:

```tsx
				<CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-primary" />
```

(substitui a linha atual `<CheckCircle2 className="size-4 shrink-0 text-primary" />`, por volta de L62)

```tsx
				<AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-warning" />
```

(substitui a linha atual `<AlertTriangle className="size-4 shrink-0 text-warning" />`, por volta de L79)

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx`
Expected: PASS — todos os testes do arquivo (os 9 já existentes + os 2 novos) passam.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator
  commits at the integration barrier. If your prompt says you are one of several
  implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/features/admin/analytics/components/at-risk-alert-zone.tsx apps/frontend/src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx
git commit -m "fix(a11y): oculta ícones decorativos de AtRiskAlertZone para leitores de tela"
```

## Critérios de Sucesso

- `CheckCircle2` (estado "academia saudável") possui `aria-hidden="true"` — FR-007.
- `AlertTriangle` (estado "membros em risco") possui `aria-hidden="true"` — FR-007.
- Nenhum texto visível adjacente aos ícones foi alterado; a informação transmitida pelos ícones continua disponível como texto para leitores de tela.
- Os 9 testes pré-existentes em `at-risk-alert-zone.test.tsx` continuam passando sem alteração.
