# Task 6: Página: seleção, painel, gaveta e exclusão [FR-003, FR-006, FR-013, FR-014, FR-016, FR-017]

**Status:** PENDING

**PRD:** `../prd/prd-calendario-redesign-painel-gaveta.md`

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

**Tier:** capable

## Visão Geral

Integra tudo na `CalendarPage`: clicar num dia só o seleciona, o painel mostra o dia e a lista do mês, "Editar" e "Adicionar nota" abrem a gaveta, e a exclusão (pelo painel ou pela gaveta) passa pelo diálogo de confirmação. A página passa a ser dona do dia selecionado derivado, da devolução do foco ao botão do dia e do carregamento independente de feriados e notas, com a grade sempre visível. O modal antigo deixa de ser usado.

## Arquivos

- Modify: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/calendario/page.tsx`
- Modify (test): `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
- Modify (test): `apps/frontend/src/app/(authenticated)/calendario/page.test.tsx`
- Modify (test): `apps/frontend/src/features/training-notes/ui/training-notes-calendar.test.tsx`
- Delete (test): `apps/frontend/src/features/training-notes/ui/training-note-modal.test.tsx` (o modal deixa de ser aberto pela página; a cobertura migrou para as tasks 2 e 3)

## Interfaces

- **Consome:** `resolveSelectedDay(input: { clicked: string | null; year: number; monthIndex: number; today: Date }): string` de `@/features/calendario-feriados/lib/resolve-selected-day` (task-01); `interface DeleteNoteDialogProps { open: boolean; date: string | null; onOpenChange: (open: boolean) => void; onDeleted: () => void }` e `DeleteNoteDialog(props: DeleteNoteDialogProps)` de `@/features/training-notes/ui/delete-note-dialog` (task-02); `interface NoteDrawerProps { open: boolean; date: string | null; feriadoNome?: string; initialTexto?: string; onOpenChange: (open: boolean) => void; onRequestDelete: (date: string) => void; onCloseAutoFocus: (event: Event) => void }` e `NoteDrawer(props: NoteDrawerProps)` de `@/features/training-notes/ui/training-note-drawer` (task-03); `type FonteStatus = "ok" | "carregando" | "erro"` e `statusDaFonte(input: { isPending: boolean; isError: boolean; hasData: boolean }): FonteStatus` de `@/features/calendario-feriados/model/fonte-status` (task-04); `interface MonthAgendaProps { feriados: Feriado[]; notas: TrainingNoteDTO[]; selectedDate: string; onSelectDay: (date: string) => void; notasStatus: FonteStatus; feriadosStatus: FonteStatus; onRetryNotas: () => void; onRetryFeriados: () => void }` e `MonthAgenda(props: MonthAgendaProps)` de `@/features/calendario-feriados/ui/month-agenda` (task-04; o contêiner rolável tem `data-testid="month-agenda-lista"`); `interface DayDetailPanelProps { date: string; feriado?: Feriado; nota?: TrainingNoteDTO; notasStatus: FonteStatus; feriadosStatus: FonteStatus; onEdit: () => void; onDelete: () => void; onRetryNotas: () => void; onRetryFeriados: () => void; children?: ReactNode }` e `DayDetailPanel(props: DayDetailPanelProps)` de `@/features/calendario-feriados/ui/day-detail-panel` (task-05); existentes, sem task: `useFeriadosQuery(year)`, `useTrainingNotesQuery(year, month)`, `useCalendarNavigation`, `trainingNotesQueryKey(year, month)`
- **Produz:** `MonthlyCalendarProps.selectedDate?: string` e `aria-pressed` no botão do dia (usados pela task-08); a `CalendarPage` integrada, com os estados `drawerOpen: boolean` e `deleteDate: string | null` e o efeito de teclado `keydown` (usados pela task-07)

### Skills a invocar

- `tanstack-query-best-practices`: status por fonte a partir de `isPending`/`isError`/`data`; `refetch` para os retries; cache preservado na falha de refetch.
- `wcag-audit-patterns`: `aria-pressed` no dia, foco devolvido ao botão do dia, landmark do painel, ordem de foco com gaveta e diálogo.
- `vercel-composition-patterns`: extrair subcomponentes da página em vez de acumular condicionais e props.
- `vercel-react-best-practices`: dia selecionado derivado na renderização (sem `useEffect` de sincronização).
- `test-antipatterns`: msw real e `CalendarPage` real; nada de mocks dos componentes integrados (só o `toast`).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-redesign-painel-gaveta-visual.md` (seções "Layout" e "Célula do dia"; norte, não pixel final)
- **Fonte de design original:** nenhuma; layout definido por mockup do companion a partir de um screenshot do estado atual
- **Confirmar com o usuário:** não há fonte de design original (a spec registra "nenhuma"); só reabrir a pergunta se o usuário trouxer uma
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` (abrir `/calendario`, capturar screenshot e comparar com o norte); sem ferramenta de design-to-code
- **Decisões visuais já tomadas (não refazer):** duas colunas a partir de 1280px (grade `minmax(0,1fr)` e painel de 320px, `gap-6`), uma coluna abaixo disso com o painel depois da grade; o painel tem a altura da grade a partir de 1280px e a lista rola por dentro; dia selecionado com anel duplo ciano (`0 0 0 2px` fundo e `0 0 0 4px` `accent`) distinto do anel de foco de teclado; hoje e feriado mantêm as cores atuais (hoje prevalece); só tokens semânticos; sem `rounded-full`/`rounded-[Npx]`.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler `### Fidelidade Visual` acima. Sem fonte de design original: construir contra o mockup curado e o tema real. Conferir o resultado em `/calendario` com `playwright-cli`. A verificação do layout responsivo (AC-16) é do QA e não bloqueia a task.

- **Step 1: Write the failing tests for the selected day (monthly-calendar and page)**

`monthly-calendar.test.tsx` (usar o helper de render que o arquivo já usa; abaixo, `renderWithProviders`):

```tsx
test("AC-02 o dia selecionado tem aria-pressed e os demais não", () => {
	const { container } = renderWithProviders(
		<MonthlyCalendar monthIndex={9} year={2026} feriados={[]} onPrevMonth={vi.fn()} onNextMonth={vi.fn()} selectedDate="2026-10-12" />,
	)
	const selecionado = container.querySelector('button[data-date="2026-10-12"]')
	const outro = container.querySelector('button[data-date="2026-10-13"]')
	expect(selecionado).toHaveAttribute("aria-pressed", "true")
	expect(outro).toHaveAttribute("aria-pressed", "false")
})
```

`page.test.tsx`: novo `describe("seleção do dia")` com `beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 17)) })` e `afterEach(() => vi.useRealTimers())`; `instalarNotasMock()` em cada teste; `const painel = () => screen.getByRole("complementary", { name: "Resumo do mês" })`; `const tituloDoPainel = () => within(painel()).getByRole("heading", { level: 2 })`. Navegação com os nomes acessíveis já usados no arquivo: `/próximo mês/i`, `/mês anterior/i`, "Ir para 2025 (ano anterior)", "Ir para 2026 (ano seguinte)", "Ir para hoje".

```tsx
test("AC-02 clicar no dia só o seleciona e o painel mostra o dia, sem abrir a gaveta", async () => {
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	const dia20 = await screen.findByRole("button", { name: /^20 de outubro/ })
	expect(dia20).toHaveAttribute("aria-pressed", "false")
	await user.click(dia20)
	expect(dia20).toHaveAttribute("aria-pressed", "true")
	expect(tituloDoPainel()).toHaveTextContent("20 de outubro")
	expect(screen.queryByLabelText("Nota do treino")).not.toBeInTheDocument()
	await user.click(dia20) // não é alternância
	expect(dia20).toHaveAttribute("aria-pressed", "true")
})

test("AC-03 hoje é o padrão ao abrir e o dia 1 num mês sem hoje", async () => {
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	await screen.findByRole("button", { name: /^17 de outubro/ })
	expect(tituloDoPainel()).toHaveTextContent("17 de outubro")
	await user.click(screen.getByRole("button", { name: /próximo mês/i }))
	expect(tituloDoPainel()).toHaveTextContent("1 de novembro")
})

test("AC-03 trocar de mês zera o dia clicado", async () => {
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	await user.click(await screen.findByRole("button", { name: /^20 de outubro/ }))
	await user.click(screen.getByRole("button", { name: /próximo mês/i }))
	await user.click(screen.getByRole("button", { name: /mês anterior/i }))
	expect(tituloDoPainel()).toHaveTextContent("17 de outubro")
})

test("AC-03 trocar de ano e usar Hoje zeram o dia clicado", async () => {
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	await user.click(await screen.findByRole("button", { name: /^20 de outubro/ }))
	await user.click(screen.getByRole("button", { name: "Ir para 2025 (ano anterior)" }))
	expect(tituloDoPainel()).toHaveTextContent(/^1 de /)
	await user.click(screen.getByRole("button", { name: "Ir para 2026 (ano seguinte)" }))
	expect(tituloDoPainel()).toHaveTextContent("17 de outubro")
	await user.click(screen.getByRole("button", { name: /próximo mês/i }))
	await user.click(await screen.findByRole("button", { name: /^20 de novembro/ }))
	await user.click(screen.getByRole("button", { name: "Ir para hoje" }))
	expect(tituloDoPainel()).toHaveTextContent("17 de outubro")
})
```

Três testes de AC-13 no mesmo arquivo (`import { HttpResponse, delay, http } from "msw"`; `endpoint` de `@/test/msw/handlers`; `instalarNotasMock`/`criarNotaMock`; `FERIADO_12 = { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national" }` no formato cru da BrasilAPI):

```tsx
test("AC-13 feriados falham sem esconder a grade nem as notas, e o retry é só dos feriados", async () => {
	instalarNotasMock({ semente: [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")], feriadosComErro: true })
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	expect(await screen.findByRole("grid")).toBeInTheDocument()
	expect((await screen.findAllByText("Não foi possível carregar os feriados")).length).toBeGreaterThan(0)
	expect(await screen.findByRole("button", { name: "Selecionar 16 de outubro (nota)" })).toBeInTheDocument()
	expect(screen.queryByText("Não foi possível carregar as notas")).not.toBeInTheDocument()
	server.use(http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () => HttpResponse.json([FERIADO_12])))
	await user.click(screen.getAllByRole("button", { name: "Tentar de novo (feriados)" })[0])
	expect(await screen.findByRole("button", { name: "Selecionar 12 de outubro (feriado)" })).toBeInTheDocument()
})

test("AC-13 notas falham sem esconder a grade nem os feriados, e sem Editar nem Adicionar nota", async () => {
	instalarNotasMock({ feriados: [FERIADO_12] })
	server.use(http.get(endpoint("/training-notes"), () => HttpResponse.json({ message: "falha" }, { status: 500 })))
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	expect((await screen.findAllByText("Não foi possível carregar as notas")).length).toBeGreaterThan(0)
	expect(screen.getByRole("grid")).toBeInTheDocument()
	expect(await screen.findByRole("button", { name: "Selecionar 12 de outubro (feriado)" })).toBeInTheDocument()
	expect(screen.queryByText("Não foi possível carregar os feriados")).not.toBeInTheDocument()
	expect(screen.queryByRole("button", { name: /^(Editar|Excluir|Adicionar nota)$/ })).not.toBeInTheDocument()
	server.use(http.get(endpoint("/training-notes"), () => HttpResponse.json([])))
	await user.click(screen.getAllByRole("button", { name: "Tentar de novo (notas)" })[0])
	expect(await within(painel()).findByRole("button", { name: "Adicionar nota" })).toBeInTheDocument()
})

test("AC-13 notas carregando mostram 'Carregando notas' com a grade e os feriados visíveis", async () => {
	instalarNotasMock({ feriados: [FERIADO_12] })
	server.use(http.get(endpoint("/training-notes"), async () => {
		await delay("infinite")
		return HttpResponse.json([])
	}))
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
	expect(await screen.findByRole("grid")).toBeInTheDocument()
	expect((await screen.findAllByText("Carregando notas")).length).toBeGreaterThan(0)
	expect(await screen.findByRole("button", { name: "Selecionar 12 de outubro (feriado)" })).toBeInTheDocument()
	expect(screen.queryByRole("button", { name: "Adicionar nota" })).not.toBeInTheDocument()
})
```

Reescrever em `page.test.tsx` os testes que dependiam do esqueleto de página inteira, do estado vazio do ano e do `aside` antigo, mantendo os nomes:

- "anuncia loading enquanto feriados carregam": com os feriados pendentes (o `Deferred` do arquivo), a grade (`role="grid"`) já aparece e `getAllByText("Carregando feriados")` não é vazio; ao resolver, some.
- "mostra erro recuperável quando feriados não carregam" e "refaz consulta ao acionar retry após erro": `getAllByText("Não foi possível carregar os feriados")` e `getAllByRole("button", { name: "Tentar de novo (feriados)" })` (há um retry no painel e outro na lista); o retry usa o primeiro botão.
- "mostra estado vazio quando ano não tem feriados retornados": `screen.getByText("Nenhuma nota ou feriado neste mês.")`; sem `CalendarEmptyState`.
- As asserções `within(screen.getByRole("complementary")).getByText(/Independência|Aparecida|Natal|Confraternização/)` (testes de navegação por mês) passam a escopar a lista: `within(screen.getByTestId("month-agenda-lista")).getByText(...)`, porque o nome do feriado também aparece no bloco de feriado do painel quando o dia selecionado é o feriado.
- Qualquer asserção que cite "Feriados de …", "Minhas notas" ou "Semana N" passa a citar a lista nova.

`training-notes-calendar.test.tsx`: manter o `vi.mock("sonner", ...)` já existente; substituir os 4 testes antigos (que abriam o modal por `nota-bar`) por estes. Helpers: `SEMENTE = [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")]`, `renderPagina()` (= `renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)`), `painel()` como acima, `botaoDoDia = () => document.querySelector('button[data-date="2026-10-16"]')`.

```tsx
test("salvar pela gaveta mostra a nota no painel e na lista do mês", async () => {
	instalarNotasMock()
	const user = userEvent.setup()
	renderPagina()
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	await user.click(await within(painel()).findByRole("button", { name: "Adicionar nota" }))
	await user.type(await screen.findByLabelText("Nota do treino"), "Peito + tríceps 4x12")
	await user.click(screen.getByRole("button", { name: "Salvar" }))
	await waitFor(() => expect(screen.queryByLabelText("Nota do treino")).not.toBeInTheDocument())
	expect(await screen.findAllByText("Peito + tríceps 4x12")).toHaveLength(2) // bloco da nota + linha da lista
	expect(screen.getByRole("button", { name: "Selecionar 16 de outubro (nota)" })).toBeInTheDocument()
})

test("AC-08 excluir pelo painel pede confirmação e só remove ao confirmar", async () => {
	instalarNotasMock({ semente: SEMENTE })
	const user = userEvent.setup()
	renderPagina()
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	await user.click(await within(painel()).findByRole("button", { name: "Excluir" }))
	expect(await screen.findByRole("alertdialog", { name: "Excluir a nota?" })).toBeInTheDocument()
	await user.click(screen.getByRole("button", { name: "Cancelar" }))
	expect(await within(painel()).findByRole("button", { name: "Editar" })).toBeInTheDocument()
	await user.click(within(painel()).getByRole("button", { name: "Excluir" }))
	await user.click(await screen.findByRole("button", { name: "Confirmar" }))
	expect(await within(painel()).findByText("Nenhuma nota neste dia.")).toBeInTheDocument()
	expect(screen.queryByRole("button", { name: "Selecionar 16 de outubro (nota)" })).not.toBeInTheDocument()
})

test("AC-08 excluir pela gaveta pede confirmação, fecha a gaveta e o painel fica sem nota", async () => {
	instalarNotasMock({ semente: SEMENTE })
	const user = userEvent.setup()
	renderPagina()
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	await user.click(await within(painel()).findByRole("button", { name: "Editar" }))
	await user.click(await screen.findByRole("button", { name: "Excluir" }))
	expect(await screen.findByRole("alertdialog", { name: "Excluir a nota?" })).toBeInTheDocument()
	expect(screen.getByLabelText("Nota do treino")).toBeInTheDocument() // a gaveta segue aberta por baixo
	await user.click(screen.getByRole("button", { name: "Confirmar" }))
	await waitFor(() => expect(screen.queryByLabelText("Nota do treino")).not.toBeInTheDocument())
	expect(await within(painel()).findByText("Nenhuma nota neste dia.")).toBeInTheDocument()
})

test.each([
	["Cancelar", (user: UserEvent) => user.click(screen.getByRole("button", { name: "Cancelar" }))],
	["X", (user: UserEvent) => user.click(screen.getByRole("button", { name: "Close" }))],
	["Esc", (user: UserEvent) => user.keyboard("{Escape}")],
	[
		"salvar",
		async (user: UserEvent) => {
			await user.type(screen.getByLabelText("Nota do treino"), "Costas 5x5")
			await user.click(screen.getByRole("button", { name: "Salvar" }))
		},
	],
])("AC-09 o foco volta ao botão do dia ao fechar a gaveta por %s", async (_nome, fechar) => {
	instalarNotasMock()
	const user = userEvent.setup()
	renderPagina()
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	await user.click(await within(painel()).findByRole("button", { name: "Adicionar nota" }))
	await screen.findByLabelText("Nota do treino")
	await fechar(user)
	await waitFor(() => expect(botaoDoDia()).toHaveFocus())
})

test("AC-09 o foco volta ao botão do dia ao excluir pela gaveta", async () => {
	instalarNotasMock({ semente: SEMENTE })
	const user = userEvent.setup()
	renderPagina()
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	await user.click(await within(painel()).findByRole("button", { name: "Editar" }))
	await user.click(await screen.findByRole("button", { name: "Excluir" }))
	await user.click(await screen.findByRole("button", { name: "Confirmar" }))
	await waitFor(() => expect(screen.queryByLabelText("Nota do treino")).not.toBeInTheDocument())
	await waitFor(() => expect(botaoDoDia()).toHaveFocus())
})
```

Importar `type UserEvent` de `@testing-library/user-event`, `QueryClient` de `@tanstack/react-query`, `http`/`HttpResponse` de `msw`, `server`, `endpoint`, `act`.

- **Step 2: Review Focus: Excluir pelo painel: o botão "Excluir" some com a nota, e o foco ainda volta ao botão do dia — Write the failing test**

Em `training-notes-calendar.test.tsx`:

```tsx
test("AC-09 excluir pelo painel devolve o foco ao botão do dia mesmo com o botão Excluir desmontado", async () => {
	instalarNotasMock({ semente: SEMENTE })
	const user = userEvent.setup()
	renderPagina()
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	await user.click(await within(painel()).findByRole("button", { name: "Excluir" }))
	await user.click(await screen.findByRole("button", { name: "Confirmar" }))
	await waitFor(() =>
		expect(within(painel()).queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument(),
	)
	expect(within(painel()).getByText("Nenhuma nota neste dia.")).toBeInTheDocument()
	expect(botaoDoDia()).toHaveFocus() // asserção feita depois que o botão Excluir já sumiu
})
```

- **Step 3: Review Focus: Refetch de notas que falha com dados em cache mantém Editar, Adicionar e Excluir e não mostra erro — Write the failing test**

Em `training-notes-calendar.test.tsx`:

```tsx
test("Review Focus: refetch de notas que falha com dados em cache mantém Editar, Adicionar e Excluir e não mostra erro", async () => {
	instalarNotasMock({ semente: SEMENTE })
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const user = userEvent.setup()
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />, { queryClient })
	await user.click(await screen.findByRole("button", { name: /^16 de outubro/ }))
	expect(await within(painel()).findByRole("button", { name: "Excluir" })).toBeInTheDocument()

	server.use(http.get(endpoint("/training-notes"), () => HttpResponse.json({ message: "falha" }, { status: 500 })))
	await act(() => queryClient.invalidateQueries({ queryKey: ["training-notes"] }))
	await waitFor(() => expect(queryClient.getQueryState(trainingNotesQueryKey(2026, 10))?.status).toBe("error"))

	expect(within(painel()).getByRole("button", { name: "Editar" })).toBeInTheDocument()
	expect(within(painel()).getByRole("button", { name: "Excluir" })).toBeInTheDocument()
	expect(screen.queryByText("Não foi possível carregar as notas")).not.toBeInTheDocument()
	await user.click(screen.getByRole("button", { name: /^20 de outubro/ }))
	expect(within(painel()).getByRole("button", { name: "Adicionar nota" })).toBeInTheDocument()
})
```

- **Step 4: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
Expected: FAIL: `AC-02 o dia selecionado tem aria-pressed...` falha porque o botão não tem `aria-pressed`.

Run: `cd apps/frontend && pnpm exec vitest run 'src/app/(authenticated)/calendario/page.test.tsx'`
Expected: FAIL: o painel (`role="complementary"` com título `h2` da data), `aria-pressed` e a lista `month-agenda-lista` ainda não existem na página.

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
Expected: FAIL: clicar no dia ainda abre o modal antigo; "Editar"/"Adicionar nota" do painel não existem.

- **Step 5: Implement the selected day in `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`**

`MonthlyCalendarProps` ganha `selectedDate?: string`. O `DayCell` recebe `isSelected: boolean` e, quando `selectedDate` é informado, define `aria-pressed={isSelected}` no botão; o dia selecionado ganha o anel duplo ciano como `box-shadow` (`0 0 0 2px` na cor de fundo e `0 0 0 4px` em `accent`, via classes de sombra do Tailwind com as variáveis de `globals.css`), distinto do `focus-ring-duplo`. Demais props, conteúdo da célula e cores de hoje/feriado não mudam nesta task. Biome: complexidade cognitiva máxima 5 por função.

- **Step 6: Implement the integrated `CalendarPage` in `apps/frontend/src/app/(authenticated)/calendario/page.tsx`**

Assinatura inalterada: `CalendarPage({ initialYear, initialMonth }: { initialYear?: number; initialMonth?: number })`. Decisões:

- Estado: `clickedDate: string | null`, `drawerOpen: boolean`, `deleteDate: string | null` (`modalOpen`/`selectedDate` antigos saem). `selectedDate = resolveSelectedDay({ clicked: clickedDate, year: selectedYear, monthIndex: selectedMonth, today: new Date() })`, derivado na renderização (sem efeito).
- `handleSelectDay(date: string): void` só faz `setClickedDate(date)`. Os handlers de mês anterior/próximo, ano anterior/próximo (hoje passados direto ao hook: envolver `goPrevYear`/`goNextYear`) e Hoje também fazem `setClickedDate(null)`.
- `focusDay(date: string): void` = `queueMicrotask(() => document.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)?.focus())` (a consulta que a página já usa). É usada por `onCloseAutoFocus` da gaveta (`(event) => { event.preventDefault(); focusDay(selectedDate) }`) e por `onDeleted` do diálogo.
- Notas e feriados: `notas` (mapa `data -> texto`) continua alimentando `MonthlyCalendar`; a nota do dia é a de `useTrainingNotesQuery(selectedYear, selectedMonth + 1).data` com `data === selectedDate`; `feriado` do dia é o de `feriadosDoMes` com `date === selectedDate`. Status por fonte com `statusDaFonte({ isPending, isError, hasData: query.data !== undefined })` para cada query; retries chamam `query.refetch()` de cada fonte.
- A grade sempre renderiza: saem `CalendarLoadingState` e `CalendarEmptyState`; o erro de feriados vira o estado de erro do painel e da lista. Manter o `<span role="status">` de `isFetching`.
- O `<aside>` vira `<DayDetailPanel date={selectedDate} feriado nota notasStatus feriadosStatus onEdit={() => setDrawerOpen(true)} onDelete={() => setDeleteDate(selectedDate)} onRetryNotas onRetryFeriados><MonthAgenda … onSelectDay={handleSelectDay} /></DayDetailPanel>`. Layout: manter `xl:grid-cols-[minmax(0,1fr)_320px]` e uma coluna abaixo de 1280px (painel depois da grade). A partir de 1280px o conteúdo do painel não pode aumentar a altura da linha do grid (o painel iguala a altura da grade e a lista rola por dentro); a técnica (grid com `stretch` ou posicionamento interno) fica a critério do construtor.
- `<NoteDrawer open={drawerOpen} date={selectedDate} feriadoNome={feriado?.name} initialTexto={nota?.texto} onOpenChange={setDrawerOpen} onRequestDelete={setDeleteDate} onCloseAutoFocus={…} />` e `<DeleteNoteDialog open={deleteDate !== null} date={deleteDate} onOpenChange={(aberto) => { if (!aberto) setDeleteDate(null) }} onDeleted={() => { setDrawerOpen(false); focusDay(selectedDate) }} />` no lugar do `TrainingNoteModal`. `HolidayList`, `TrainingNotesList` e `TrainingNoteModal` deixam de ser importados pela página (os arquivos saem na task-07).
- Complexidade: extrair subcomponentes (por exemplo o corpo do conteúdo e o painel com a lista) para não aumentar, de preferência reduzir, os `biome-ignore` de complexidade cognitiva que a página já tem.
- Se o teste do foco (passo 2) mostrar o foco indo para o `body` depois da exclusão pelo painel, a causa está em quem devolve o foco por último: corrigir em `delete-note-dialog.tsx` (task-02, `onCloseAutoFocus` só depois de exclusão confirmada) ou em `focusDay`, sem `setTimeout` de espera.

- **Step 7: Remove the obsolete modal test**

Apagar `apps/frontend/src/features/training-notes/ui/training-note-modal.test.tsx`: os 4 comportamentos migraram (texto vazio e 409 e rede para `training-note-drawer.test.tsx`; 404 para `delete-note-dialog.test.tsx`) e o teste não pode mais abrir o modal pela página. O componente `training-note-modal.tsx` só sai na task-07.

- **Step 8: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
Expected: PASS: os 8 testes existentes mais o novo.

Run: `cd apps/frontend && pnpm exec vitest run 'src/app/(authenticated)/calendario/page.test.tsx'`
Expected: PASS: todos os testes do arquivo, incluindo os AC-02, AC-03 e AC-13 novos.

Run: `cd apps/frontend && pnpm exec vitest run src/features/training-notes/ui/training-notes-calendar.test.tsx`
Expected: PASS: todos os testes do arquivo, incluindo os dois Review Focus e os AC-08 e AC-09.

- **Step 9: Commit** *(somente quando `workflow.auto_commit` for true; senão reporte os arquivos)*

```bash
git add apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx "apps/frontend/src/app/(authenticated)/calendario/page.tsx" "apps/frontend/src/app/(authenticated)/calendario/page.test.tsx" apps/frontend/src/features/training-notes/ui/training-notes-calendar.test.tsx
git rm apps/frontend/src/features/training-notes/ui/training-note-modal.test.tsx
git commit -m "feat(calendario): pagina com painel do dia, gaveta e exclusao"
```

## Critérios de Sucesso

- AC-02 [unit]: WHEN o usuário clica em um dia THEN o dia fica selecionado (`aria-pressed`) e o painel passa a mostrar esse dia, sem abrir a gaveta
- AC-03 [unit]: WHEN a página abre ou o usuário troca de mês, de ano ou usa "Hoje" THEN o dia selecionado é hoje se o mês exibido o contém e o dia 1 caso contrário, e um dia clicado em outro mês deixa de valer
- AC-08 [unit]: WHEN o usuário aciona Excluir, no painel ou na gaveta, THEN aparece "Excluir a nota?" e a nota só é removida ao confirmar; ao confirmar, a gaveta (se aberta) fecha e o painel mostra "Nenhuma nota neste dia."
- AC-09 [unit]: WHEN a gaveta fecha por Cancelar, X, Esc, salvar ou excluir, ou uma exclusão termina pelo painel, THEN o foco volta ao botão do dia (`data-date`)
- AC-13 [unit]: WHEN a consulta de notas ou a de feriados está carregando ou falha sem dados THEN a grade continua visível, o painel e a lista mostram carregando ou erro com "Tentar de novo" só para aquela fonte e a outra segue visível; com dados em cache, uma falha de refetch não esconde nada
- AC-16 [unverified]: WHEN a viewport tem 1280px ou mais THEN painel e grade ficam lado a lado com a mesma altura, e abaixo de 1280px o painel fica depois da grade; abaixo de 768px a gaveta abre pela base · Razão: o happy-dom não calcula layout nem media queries · conferência: abrir `/calendario` com `playwright-cli` em 1280px (painel e grade lado a lado, mesma altura, lista rolando por dentro com 30 notas), em 1000px (painel depois da grade) e em 767px (a gaveta abre pela base)
- A página não usa mais `TrainingNoteModal`, `HolidayList` nem `TrainingNotesList`; o `training-note-modal.test.tsx` foi removido sem deixar teste vermelho (FR-003, FR-006, FR-013, FR-014, FR-016).
