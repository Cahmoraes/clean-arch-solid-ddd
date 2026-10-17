# Task 5: Painel do dia selecionado [FR-004, FR-005, FR-016]

**Status:** PENDING

**PRD:** `../prd/prd-calendario-redesign-painel-gaveta.md`

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

**Tier:** standard

## Visão Geral

Cria o `DayDetailPanel`, o card à direita da grade que mostra o dia selecionado em detalhe: data por extenso, bloco de feriado nacional e bloco de nota com as ações Editar, Excluir e Adicionar nota. Os blocos de feriado e de nota tratam carregamento e erro de forma independente, e as ações de nota somem quando as notas não carregaram. O painel hospeda a lista do mês (`MonthAgenda`) como filho.

## Arquivos

- Create: `apps/frontend/src/features/calendario-feriados/ui/day-detail-panel.tsx`
- Test: `apps/frontend/src/features/calendario-feriados/ui/day-detail-panel.test.tsx`

## Interfaces

- **Consome:** `type FonteStatus = "ok" | "carregando" | "erro"` de `@/features/calendario-feriados/model/fonte-status` (task-04); `MSG_CARREGANDO_NOTAS`, `MSG_CARREGANDO_FERIADOS`, `MSG_ERRO_NOTAS`, `MSG_ERRO_FERIADOS`, `TEXTO_TENTAR_DE_NOVO`, `ARIA_TENTAR_DE_NOVO_NOTAS`, `ARIA_TENTAR_DE_NOVO_FERIADOS` (`string`) de `@/features/calendario-feriados/model/fonte-status` (task-04); `formatarDataCurta(date: string): string` de `@/features/training-notes/lib/note-messages` (task-02); `diaDaSemana(date: string): string` de `@/features/training-notes/lib/note-messages` (task-02); existentes, sem task: `Feriado` de `@/features/calendario-feriados/model/feriado`, `TrainingNoteDTO` de `@/features/training-notes/api/use-training-notes`, `Card, CardHeader, CardTitle, CardContent` de `@/components/ui/card` (`CardTitle` aceita `as="h2"`), `Button` de `@/components/ui/button`
- **Produz:** `interface DayDetailPanelProps { date: string; feriado?: Feriado; nota?: TrainingNoteDTO; notasStatus: FonteStatus; feriadosStatus: FonteStatus; onEdit: () => void; onDelete: () => void; onRetryNotas: () => void; onRetryFeriados: () => void; children?: ReactNode }`; `DayDetailPanel(props: DayDetailPanelProps)` em `features/calendario-feriados/ui/day-detail-panel.tsx` (a raiz tem `role="complementary"` e `aria-label="Resumo do mês"`)

### Skills a invocar

- `wcag-audit-patterns`: landmark `complementary` com nome, `h2` para a data, estados com `role="status"`/`role="alert"`, botões com nome acessível.
- `vercel-composition-patterns`: blocos (feriado, nota) como subcomponentes e `children` para a lista, sem flags booleanas.
- `vercel-react-best-practices`: componente de apresentação puro, sem estado nem efeito.
- `test-antipatterns`: props reais, sem mocks do componente; os callbacks são `vi.fn()` e a asserção é sobre quando são chamados.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-redesign-painel-gaveta-visual.md` (seção "Painel do dia", itens 1 a 3; norte, não pixel final)
- **Fonte de design original:** nenhuma; layout definido por mockup do companion a partir de um screenshot do estado atual
- **Confirmar com o usuário:** não há fonte de design original (a spec registra "nenhuma"); só reabrir a pergunta se o usuário trouxer uma
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` (abrir `/calendario`, capturar screenshot e comparar com o norte); sem ferramenta de design-to-code
- **Decisões visuais já tomadas (não refazer):** card com chanfro de 12px; cabeçalho com a data por extenso em `font-display` (VT323), dia da semana em `text-muted-foreground` e chip "selecionado"; bloco de feriado com borda esquerda âmbar de 3px, rótulo "FERIADO NACIONAL" em 10px caixa alta e nome em negrito; bloco de nota com borda esquerda ciano de 3px, rótulo "NOTA DO DIA", texto, `Editar` (outline, sm) e `Excluir` (destructive, sm); sem nota: "Nenhuma nota neste dia." e `Adicionar nota` (primário); só tokens semânticos; sem `rounded-full`/`rounded-[Npx]`; em linha com `font-display` não usar `font-bold|semibold|medium`, `text-xs`, `text-sm` nem `text-[Npx]` com N<15.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler `### Fidelidade Visual` acima. Sem fonte de design original: construir contra o mockup curado e o tema real (`apps/frontend/src/app/globals.css`). Não bloqueia.

- **Step 1: Write the failing tests**

`day-detail-panel.test.tsx` (`render` de `@testing-library/react`, `userEvent`). Dados: `FERIADO = { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national", isNational: true }`; `NOTA = criarNotaMock("2026-10-12", "treino com os irmãos")` de `@/test/msw/training-notes-mock` (confirmar que serve como `TrainingNoteDTO`; se faltar campo, completar no teste). Helper `renderPainel(props?: Partial<DayDetailPanelProps>)` com padrão `date: "2026-10-12"`, `notasStatus: "ok"`, `feriadosStatus: "ok"` e callbacks `vi.fn()`.

```tsx
test("AC-04 dia com feriado e nota mostra os dois blocos com Editar e Excluir", () => {
	renderPainel({ feriado: FERIADO, nota: NOTA })
	const painel = screen.getByRole("complementary", { name: "Resumo do mês" })
	expect(within(painel).getByRole("heading", { level: 2, name: "12 de outubro" })).toBeInTheDocument()
	expect(within(painel).getByText("segunda-feira")).toBeInTheDocument()
	expect(within(painel).getByText(/feriado nacional/i)).toBeInTheDocument()
	expect(within(painel).getByText("Nossa Senhora Aparecida")).toBeInTheDocument()
	expect(within(painel).getByText("treino com os irmãos")).toBeInTheDocument()
	expect(within(painel).getByRole("button", { name: "Editar" })).toBeInTheDocument()
	expect(within(painel).getByRole("button", { name: "Excluir" })).toBeInTheDocument()
})

test("AC-05 dia sem nota mostra 'Nenhuma nota neste dia.' e Adicionar nota, sem Editar nem Excluir", () => {
	renderPainel()
	expect(screen.getByText("Nenhuma nota neste dia.")).toBeInTheDocument()
	expect(screen.getByRole("button", { name: "Adicionar nota" })).toBeInTheDocument()
	expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument()
	expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument()
	expect(screen.queryByText(/feriado nacional/i)).not.toBeInTheDocument()
})

test("Editar, Excluir e Adicionar nota chamam os callbacks", async () => {
	const onEdit = vi.fn()
	const onDelete = vi.fn()
	const user = userEvent.setup()
	const { unmount } = renderPainel({ nota: NOTA, onEdit, onDelete })
	await user.click(screen.getByRole("button", { name: "Editar" }))
	await user.click(screen.getByRole("button", { name: "Excluir" }))
	expect(onEdit).toHaveBeenCalledTimes(1)
	expect(onDelete).toHaveBeenCalledTimes(1)
	unmount()
	const onAdd = vi.fn()
	renderPainel({ onEdit: onAdd })
	await user.click(screen.getByRole("button", { name: "Adicionar nota" }))
	expect(onAdd).toHaveBeenCalledTimes(1)
})

test("erro de notas mostra a mensagem com retry, esconde as ações e mantém o feriado", async () => {
	const onRetryNotas = vi.fn()
	const user = userEvent.setup()
	renderPainel({ feriado: FERIADO, notasStatus: "erro", onRetryNotas })
	expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as notas")
	expect(screen.getByText("Nossa Senhora Aparecida")).toBeInTheDocument()
	for (const nome of ["Editar", "Excluir", "Adicionar nota"]) {
		expect(screen.queryByRole("button", { name: nome })).not.toBeInTheDocument()
	}
	await user.click(screen.getByRole("button", { name: "Tentar de novo (notas)" }))
	expect(onRetryNotas).toHaveBeenCalledTimes(1)
})

test("carregando notas mostra 'Carregando notas' e esconde as ações", () => {
	renderPainel({ notasStatus: "carregando" })
	expect(screen.getByRole("status")).toHaveTextContent("Carregando notas")
	expect(screen.queryByRole("button", { name: "Adicionar nota" })).not.toBeInTheDocument()
})

test("erro de feriados mostra a mensagem com retry e mantém a nota editável", async () => {
	const onRetryFeriados = vi.fn()
	const user = userEvent.setup()
	renderPainel({ nota: NOTA, feriadosStatus: "erro", onRetryFeriados })
	expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os feriados")
	expect(screen.getByText("treino com os irmãos")).toBeInTheDocument()
	expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument()
	await user.click(screen.getByRole("button", { name: "Tentar de novo (feriados)" }))
	expect(onRetryFeriados).toHaveBeenCalledTimes(1)
})

test("carregando feriados mostra 'Carregando feriados' sem esconder a nota", () => {
	renderPainel({ nota: NOTA, feriadosStatus: "carregando" })
	expect(screen.getByRole("status")).toHaveTextContent("Carregando feriados")
	expect(screen.getByText("treino com os irmãos")).toBeInTheDocument()
})

test("renderiza os filhos abaixo dos blocos do dia", () => {
	renderPainel({ children: <p>lista do mês</p> })
	expect(screen.getByText("lista do mês")).toBeInTheDocument()
})
```

- **Step 2: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/day-detail-panel.test.tsx`
Expected: FAIL: o módulo `./day-detail-panel` não existe.

- **Step 3: Implement `DayDetailPanel(props: DayDetailPanelProps)` in `apps/frontend/src/features/calendario-feriados/ui/day-detail-panel.tsx`**

`"use client"`. Raiz: `Card` com `role="complementary"` e `aria-label="Resumo do mês"` (os testes da página dependem desse papel e desse nome). Conteúdo, de cima para baixo:

- Cabeçalho: `CardTitle as="h2"` com `formatarDataCurta(date)`; `diaDaSemana(date)` em `text-muted-foreground`; chip "selecionado".
- Bloco de feriado: `feriadosStatus === "ok"` e `feriado` -> rótulo "FERIADO NACIONAL" e o nome em negrito; "ok" sem `feriado` -> nenhum bloco; `"carregando"` -> `<p role="status">` `MSG_CARREGANDO_FERIADOS`; `"erro"` -> `<div role="alert">` `MSG_ERRO_FERIADOS` + `Button variant="outline" size="sm"` (texto `TEXTO_TENTAR_DE_NOVO`, `aria-label` `ARIA_TENTAR_DE_NOVO_FERIADOS`, `onClick={onRetryFeriados}`).
- Bloco de nota: `notasStatus === "ok"` com `nota` -> rótulo "NOTA DO DIA", `nota.texto`, `Editar` (`onEdit`) e `Excluir` (`onDelete`); "ok" sem `nota` -> "Nenhuma nota neste dia." e `Adicionar nota` (primário, `onEdit`); `"carregando"` -> `<p role="status">` `MSG_CARREGANDO_NOTAS`; `"erro"` -> `<div role="alert">` `MSG_ERRO_NOTAS` + retry (`ARIA_TENTAR_DE_NOVO_NOTAS`, `onRetryNotas`). Com `notasStatus` diferente de "ok" nenhuma ação de nota aparece.
- `children` abaixo dos blocos, num contêiner `flex min-h-0 flex-1 flex-col` (a lista do mês rola por dentro, ver task-04).
- Biome: complexidade cognitiva máxima 5; um subcomponente por bloco/estado.

- **Step 4: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/day-detail-panel.test.tsx`
Expected: PASS: 8 testes.

- **Step 5: Commit** *(somente quando `workflow.auto_commit` for true; senão reporte os arquivos)*

```bash
git add apps/frontend/src/features/calendario-feriados/ui/day-detail-panel.tsx apps/frontend/src/features/calendario-feriados/ui/day-detail-panel.test.tsx
git commit -m "feat(calendario): painel do dia selecionado"
```

## Critérios de Sucesso

- AC-04 [unit]: WHEN o dia selecionado tem feriado e nota THEN o painel mostra o bloco de feriado nacional e o bloco de nota com Editar e Excluir
- AC-05 [unit]: WHEN o dia selecionado não tem nota THEN o painel mostra "Nenhuma nota neste dia." e "Adicionar nota", sem Editar nem Excluir
- Cada fonte mostra carregando ou erro com "Tentar de novo" só no próprio bloco, sem esconder o outro, e as ações de nota só aparecem com as notas carregadas (FR-016; o AC-13 em nível de página é da task-06).
