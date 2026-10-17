# Task 8: Célula do dia compacta com marcadores e tooltip [FR-001, FR-002]

**Status:** PENDING

**PRD:** `../prd/prd-calendario-redesign-painel-gaveta.md`

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

**Tier:** standard

## Visão Geral

Deixa a célula do dia limpa: só o número e, abaixo, marcadores decorativos (quadrado âmbar para feriado, losango ciano para nota). O texto do feriado e da nota sai da célula e passa a aparecer num tooltip ao passar o mouse e ao focar; o resumo falado continua no `aria-label`. É a última peça visual do redesign, depois que o painel e a gaveta (tasks anteriores) já mostram o detalhe do dia.

## Arquivos

- Modify: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`
- Test: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx`

## Interfaces

- **Consome:** `MonthlyCalendarProps.selectedDate?: string` e o `aria-pressed` do botão do dia, já presentes em `monthly-calendar.tsx` depois da task-06 (task-06). Existentes, sem task: `Tooltip, TooltipTrigger, TooltipContent` de `@/components/ui/tooltip`; `formatDayAriaLabel` (função interna do arquivo, mantida sem mudança).
- **Produz:** N/A (folha). O arquivo expõe a mesma `MonthlyCalendarProps`; os marcadores têm `data-testid="marcador-feriado-{date}"` e `data-testid="marcador-nota-{date}"`.

### Skills a invocar

- `wcag-audit-patterns`: marcadores `aria-hidden` com o significado no `aria-label` da célula; tooltip aberto também por foco.
- `vercel-react-best-practices`: manter a célula simples e sem estado novo.
- `test-antipatterns`: asserções sobre o que o usuário vê (texto ausente da célula, marcadores, tooltip), não sobre classes internas.
- `playwright-cli`: conferir a célula compacta em `/calendario` e comparar com o norte visual.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-redesign-painel-gaveta-visual.md` (seção "Célula do dia (modo compacto)"; norte, não pixel final)
- **Fonte de design original:** nenhuma; layout definido por mockup do companion a partir de um screenshot do estado atual
- **Confirmar com o usuário:** não há fonte de design original (a spec registra "nenhuma"); só reabrir a pergunta se o usuário trouxer uma
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` (abrir `/calendario`, capturar screenshot e comparar com o norte); sem ferramenta de design-to-code
- **Decisões visuais já tomadas (não refazer):** altura mínima da célula próxima de 68px (`min-h-16`); número em `font-display text-lg`; linha de marcadores abaixo do número, `aria-hidden`; quadrado âmbar `size-2 bg-warning` = feriado e losango ciano `size-2 rotate-45 bg-accent` = nota, podendo coexistir; hoje = `border-primary bg-primary/10`, feriado = `border-warning bg-warning/10`, hoje + feriado = hoje prevalece; `focus-ring-duplo` mantido; só tokens semânticos; sem `rounded-full`/`rounded-[Npx]`; em linha com `font-display` não usar `font-bold|semibold|medium`, `text-xs`, `text-sm` nem `text-[Npx]` com N<15.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler `### Fidelidade Visual` acima. Sem fonte de design original: construir contra o mockup curado e o tema real (`apps/frontend/src/app/globals.css`). Não bloqueia.

- **Step 1: Write the failing tests**

Em `monthly-calendar.test.tsx` (mesmo helper de render do arquivo, com `TooltipProvider`). Dados: `FERIADO = { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national", isNational: true }` e `notas = { "2026-10-12": "treino com os irmãos" }`; props `monthIndex={9} year={2026}`. Para abrir o tooltip, reutilizar a técnica do teste existente "tooltip do feriado ao passar o mouse".

```tsx
test("AC-01 a célula não contém o texto do feriado nem da nota, só o número e marcadores", () => {
	const { container } = renderCalendario({ feriados: [FERIADO], notas })
	const celula = container.querySelector('button[data-date="2026-10-12"]') as HTMLElement
	expect(celula).toHaveTextContent(/^12$/)
	expect(within(celula).queryByText("Nossa Senhora Aparecida")).not.toBeInTheDocument()
	expect(within(celula).queryByText("treino com os irmãos")).not.toBeInTheDocument()
	expect(within(celula).getByTestId("marcador-feriado-2026-10-12")).toBeInTheDocument()
	expect(within(celula).getByTestId("marcador-nota-2026-10-12")).toBeInTheDocument()
})

test("AC-01 dia só com nota tem só o losango, dia só com feriado tem só o quadrado e dia comum não tem marcador", () => {
	renderCalendario({ feriados: [FERIADO], notas: { "2026-10-20": "Pernas" } })
	expect(screen.getByTestId("marcador-nota-2026-10-20")).toBeInTheDocument()
	expect(screen.queryByTestId("marcador-feriado-2026-10-20")).not.toBeInTheDocument()
	expect(screen.getByTestId("marcador-feriado-2026-10-12")).toBeInTheDocument()
	expect(screen.queryByTestId("marcador-nota-2026-10-12")).not.toBeInTheDocument()
	expect(screen.queryByTestId("marcador-feriado-2026-10-13")).not.toBeInTheDocument()
	expect(screen.queryByTestId("marcador-nota-2026-10-13")).not.toBeInTheDocument()
})

test("AC-15 mantém data-date, aria-current e o aria-label com dia, feriado e nota; marcadores são aria-hidden", () => {
	const { container } = renderCalendario({ feriados: [FERIADO], notas, hoje: "2026-10-12" })
	const celula = container.querySelector('button[data-date="2026-10-12"]') as HTMLElement
	expect(celula).toHaveAttribute("aria-current", "date")
	expect(celula).toHaveAttribute(
		"aria-label",
		"12 de outubro: Nossa Senhora Aparecida, feriado nacional de 2026, nota: treino com os irmãos",
	)
	expect(screen.getByTestId("marcador-feriado-2026-10-12").closest('[aria-hidden="true"]')).not.toBeNull()
	expect(screen.getByTestId("marcador-nota-2026-10-12").closest('[aria-hidden="true"]')).not.toBeNull()
})

test("AC-15 o tooltip mostra feriado e nota, nessa ordem, ao passar o mouse", async () => {
	const user = userEvent.setup()
	const { container } = renderCalendario({ feriados: [FERIADO], notas })
	await user.hover(container.querySelector('button[data-date="2026-10-12"]') as HTMLElement)
	const tooltip = await screen.findByRole("tooltip")
	expect(tooltip).toHaveTextContent("Nossa Senhora Aparecida")
	expect(tooltip).toHaveTextContent("treino com os irmãos")
	expect(tooltip.textContent?.indexOf("Nossa Senhora Aparecida")).toBeLessThan(
		tooltip.textContent?.indexOf("treino com os irmãos") ?? -1,
	)
})

test("AC-15 o tooltip de um dia só com nota abre ao focar o dia", async () => {
	const { container } = renderCalendario({ feriados: [], notas: { "2026-10-20": "Pernas" } })
	act(() => (container.querySelector('button[data-date="2026-10-20"]') as HTMLElement).focus())
	expect(await screen.findByRole("tooltip")).toHaveTextContent("Pernas")
})
```

`renderCalendario(opcoes)` é o helper do arquivo de teste (ou criado nele) que renderiza `MonthlyCalendar` com `monthIndex={9} year={2026}`, `feriados`, `notas`, `onPrevMonth`/`onNextMonth` como `vi.fn()`; `hoje` fixa a data com `vi.setSystemTime` se o arquivo já usar esse mecanismo para o teste de `aria-current`.

- **Step 2: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
Expected: FAIL: os testes novos de AC-01 e AC-15: a célula ainda contém o texto do feriado (`data-name`), não há `marcador-*` e o dia só com nota não tem tooltip.

- **Step 3: Implement the compact `DayCell` in `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`**

A assinatura de `DayCell` e as props de `MonthlyCalendar` não mudam. Valores fixados:

- A célula mostra o número em `font-display text-lg leading-none` e, abaixo, só quando há feriado ou nota, uma linha `aria-hidden="true"` (`flex h-2.5 items-center gap-2`) com os marcadores: feriado = elemento `size-2 bg-warning` com `data-testid="marcador-feriado-{dateStr}"`; nota = elemento `size-2 rotate-45 bg-accent` com `data-testid="marcador-nota-{dateStr}"`. Os dois coexistem.
- Saem o `<span data-name>` do feriado, o `nota-dot-{date}` e o `nota-bar-{date}`.
- Classes do botão: `min-h-16` no lugar de `min-h-14`, com `gap-2` entre número e marcadores; cores de hoje, feriado e hoje+feriado, `focus-ring-duplo`, `aria-pressed`/anel do dia selecionado (task-06), `data-date`, `aria-current="date"` em hoje e o `aria-label` de `formatDayAriaLabel` ficam como estão.
- O `Tooltip` envolve a célula (trigger `asChild`) quando há feriado ou nota (hoje só há feriado) e o conteúdo mostra o nome do feriado primeiro e o texto da nota depois, cada um em seu parágrafo; abre ao passar o mouse e ao focar. Dia sem feriado nem nota não renderiza tooltip.
- Biome: complexidade cognitiva máxima 5; extraia `MarcadoresDoDia` e `ConteudoDoTooltip` como subcomponentes.

- **Step 4: Adjust the existing tests that depended on the old cell**

Nos 8 testes existentes de `monthly-calendar.test.tsx`, trocar asserções que dependam de `[data-name]` ou do texto do feriado dentro da célula pela checagem do marcador (`marcador-feriado-{date}`) e do `aria-label`; os testes de cor (âmbar, hoje prevalece), `aria-current`, setas com `aria-label`, virada de ano, tooltip do feriado ao passar o mouse e "dia comum sem tooltip" seguem válidos. Procurar com `grep -rn "nota-bar\|nota-dot\|data-name" apps/frontend/src` por referências restantes (testes de página e do calendário) e ajustá-las; o `training-notes-calendar.test.tsx` e o `page.test.tsx` já não dependem de `nota-bar` desde a task-06.

- **Step 5: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
Expected: PASS: todos os testes do arquivo, incluindo os 5 novos.

Run: `cd apps/frontend && pnpm exec vitest run 'src/app/(authenticated)/calendario/page.test.tsx'`
Expected: PASS: a página segue verde com a célula compacta.

- **Step 6: Commit** *(somente quando `workflow.auto_commit` for true; senão reporte os arquivos)*

```bash
git add apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx
git commit -m "feat(calendario): celula do dia compacta com marcadores e tooltip"
```

## Critérios de Sucesso

- AC-01 [unit]: WHEN o mês é exibido THEN cada célula mostra o número e, quando houver feriado ou nota, só marcadores (quadrado âmbar e losango ciano), sem o texto do feriado nem da nota dentro da célula
- AC-15 [unit]: WHEN uma célula é renderizada THEN ela mantém `data-date`, `aria-current="date"` em hoje e o `aria-label` com dia, feriado e nota, os marcadores são `aria-hidden` e o tooltip mostra feriado e nota ao passar o mouse e ao focar
- Nenhum arquivo referencia mais `nota-bar`, `nota-dot` nem `data-name` (FR-001, FR-002).
