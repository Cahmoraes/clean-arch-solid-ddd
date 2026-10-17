# Task 4: Lista do mês com feriados e notas [FR-007, FR-008, FR-009, FR-016]

**Status:** PENDING

**PRD:** `../prd/prd-calendario-redesign-painel-gaveta.md`

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

**Tier:** standard

## Visão Geral

Cria a lista única do mês (feriados e notas em ordem cronológica, rolagem interna) que substitui `HolidayList` e `TrainingNotesList`, e o módulo `fonte-status` com o status de cada fonte de dados (feriados e notas) e os textos de carregando e erro. Cada fonte carrega e falha de forma independente: a falha de uma não esconde a outra. O módulo `fonte-status` também é usado pelo painel do dia (task-05) e pela página (task-06).

## Arquivos

- Create: `apps/frontend/src/features/calendario-feriados/model/fonte-status.ts`
- Create: `apps/frontend/src/features/calendario-feriados/ui/month-agenda.tsx`
- Test: `apps/frontend/src/features/calendario-feriados/model/fonte-status.test.ts`
- Test: `apps/frontend/src/features/calendario-feriados/ui/month-agenda.test.tsx`

## Interfaces

- **Consome:** `formatarDataCurta(date: string): string` de `@/features/training-notes/lib/note-messages` (task-02); `diaDaSemana(date: string): string` de `@/features/training-notes/lib/note-messages` (task-02); existentes, sem task: `Feriado` de `@/features/calendario-feriados/model/feriado` (`{ date: string; name: string; type: "national"; isNational: boolean }`), `TrainingNoteDTO` de `@/features/training-notes/api/use-training-notes` (`data: "YYYY-MM-DD"`, `texto: string`), `Button` de `@/components/ui/button`
- **Produz:** em `features/calendario-feriados/model/fonte-status.ts`: `type FonteStatus = "ok" | "carregando" | "erro"`; `statusDaFonte(input: { isPending: boolean; isError: boolean; hasData: boolean }): FonteStatus`; `MSG_CARREGANDO_NOTAS = "Carregando notas"`; `MSG_CARREGANDO_FERIADOS = "Carregando feriados"`; `MSG_ERRO_NOTAS = "Não foi possível carregar as notas"`; `MSG_ERRO_FERIADOS = "Não foi possível carregar os feriados"`; `TEXTO_TENTAR_DE_NOVO = "Tentar de novo"`; `ARIA_TENTAR_DE_NOVO_NOTAS = "Tentar de novo (notas)"`; `ARIA_TENTAR_DE_NOVO_FERIADOS = "Tentar de novo (feriados)"`; em `features/calendario-feriados/ui/month-agenda.tsx`: `interface MonthAgendaProps { feriados: Feriado[]; notas: TrainingNoteDTO[]; selectedDate: string; onSelectDay: (date: string) => void; notasStatus: FonteStatus; feriadosStatus: FonteStatus; onRetryNotas: () => void; onRetryFeriados: () => void }`; `MonthAgenda(props: MonthAgendaProps)` (o contêiner rolável tem `data-testid="month-agenda-lista"`)

### Skills a invocar

- `wcag-audit-patterns`: linhas como botões com nome acessível, `aria-current`, estados com `role="status"`/`role="alert"`.
- `vercel-composition-patterns`: um subcomponente por estado/fonte em vez de flags booleanas na mesma árvore.
- `vercel-react-best-practices`: ordenação/mesclagem derivada na renderização, sem estado nem efeito.
- `test-antipatterns`: testes de componente com props reais, sem mocks do próprio componente.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-redesign-painel-gaveta-visual.md` (seção "Painel do dia", itens 4 e 5; norte, não pixel final)
- **Fonte de design original:** nenhuma; layout definido por mockup do companion a partir de um screenshot do estado atual
- **Confirmar com o usuário:** não há fonte de design original (a spec registra "nenhuma"); só reabrir a pergunta se o usuário trouxer uma
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` (abrir `/calendario`, capturar screenshot e comparar com o norte); sem ferramenta de design-to-code
- **Decisões visuais já tomadas (não refazer):** rótulo "No mês · N feriado(s) · N nota(s)"; linhas cronológicas com chip de data em `font-display` (VT323, mínimo 15px) e texto em uma linha com reticências; linha de feriado com borda esquerda âmbar (`warning`) e linha de nota com borda esquerda ciano (`accent`), 3px; fade no fim da lista; só tokens semânticos; sem `rounded-full`/`rounded-[Npx]`; em linha com `font-display` não usar `font-bold|semibold|medium`, `text-xs`, `text-sm` nem `text-[Npx]` com N<15.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler `### Fidelidade Visual` acima. Sem fonte de design original: construir contra o mockup curado e o tema real (`apps/frontend/src/app/globals.css`). Não bloqueia.

- **Step 1: Write the failing tests**

`fonte-status.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { statusDaFonte } from "./fonte-status"

describe("statusDaFonte", () => {
	test("pendente sem dados é carregando", () => {
		expect(statusDaFonte({ isPending: true, isError: false, hasData: false })).toBe("carregando")
	})
	test("falha sem dados é erro", () => {
		expect(statusDaFonte({ isPending: false, isError: true, hasData: false })).toBe("erro")
	})
	test("falha de refetch com dados em cache continua ok", () => {
		expect(statusDaFonte({ isPending: false, isError: true, hasData: true })).toBe("ok")
	})
	test("pendente com dados em cache é ok", () => {
		expect(statusDaFonte({ isPending: true, isError: false, hasData: true })).toBe("ok")
	})
	test("com dados e sem pendência nem falha é ok", () => {
		expect(statusDaFonte({ isPending: false, isError: false, hasData: true })).toBe("ok")
	})
})
```

`month-agenda.test.tsx` (`render` de `@testing-library/react`, `userEvent`). Dados: `FERIADO_12 = { date: "2026-10-12", name: "Nossa Senhora Aparecida", type: "national", isNational: true }`; notas via `criarNotaMock` de `@/test/msw/training-notes-mock`. Helper `renderAgenda(props?: Partial<MonthAgendaProps>)` com padrão `feriados: []`, `notas: []`, `selectedDate: "2026-10-12"`, `notasStatus: "ok"`, `feriadosStatus: "ok"`, callbacks `vi.fn()`. Confirmar que `criarNotaMock` produz um `TrainingNoteDTO` válido para o tipo (campos em `use-training-notes.ts`); se faltar campo, completar no teste.

```tsx
test("AC-12 feriados e notas aparecem juntos em ordem cronológica, feriado antes da nota no mesmo dia", () => {
	renderAgenda({
		feriados: [FERIADO_12],
		notas: [
			criarNotaMock("2026-10-20", "Pernas"),
			criarNotaMock("2026-10-12", "treino com os irmãos"),
			criarNotaMock("2026-10-05", "Costas 5x5"),
		],
	})
	const linhas = within(screen.getByTestId("month-agenda-lista")).getAllByRole("button")
	expect(linhas.map((l) => l.getAttribute("aria-label"))).toEqual([
		"Selecionar 5 de outubro (nota)",
		"Selecionar 12 de outubro (feriado)",
		"Selecionar 12 de outubro (nota)",
		"Selecionar 20 de outubro (nota)",
	])
})

test("AC-11 clicar em uma linha seleciona o dia dela e marca a linha do dia selecionado", async () => {
	const onSelectDay = vi.fn()
	const user = userEvent.setup()
	renderAgenda({ feriados: [FERIADO_12], notas: [criarNotaMock("2026-10-20", "Pernas")], selectedDate: "2026-10-12", onSelectDay })
	expect(screen.getByRole("button", { name: "Selecionar 12 de outubro (feriado)" })).toHaveAttribute("aria-current", "true")
	await user.click(screen.getByRole("button", { name: "Selecionar 20 de outubro (nota)" }))
	expect(onSelectDay).toHaveBeenCalledWith("2026-10-20")
})

test("AC-10 com 30 notas a lista rola por dentro (contêiner com overflow-y-auto e min-h-0)", () => {
	const notas = Array.from({ length: 30 }, (_, i) =>
		criarNotaMock(`2026-10-${String(i + 1).padStart(2, "0")}`, `nota ${i + 1}`),
	)
	renderAgenda({ notas })
	const lista = screen.getByTestId("month-agenda-lista")
	expect(lista).toHaveClass("overflow-y-auto", "min-h-0", "flex-1")
	expect(within(lista).getAllByRole("button")).toHaveLength(30)
})

test("mostra o rótulo com as contagens do mês", () => {
	renderAgenda({ feriados: [FERIADO_12], notas: [criarNotaMock("2026-10-20", "Pernas"), criarNotaMock("2026-10-21", "Braço")] })
	expect(screen.getByText("No mês · 1 feriado · 2 notas")).toBeInTheDocument()
})

test("erro de notas mantém os feriados visíveis e o retry chama só o das notas", async () => {
	const onRetryNotas = vi.fn()
	const onRetryFeriados = vi.fn()
	const user = userEvent.setup()
	renderAgenda({ feriados: [FERIADO_12], notasStatus: "erro", onRetryNotas, onRetryFeriados })
	expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as notas")
	expect(screen.getByRole("button", { name: "Selecionar 12 de outubro (feriado)" })).toBeInTheDocument()
	await user.click(screen.getByRole("button", { name: "Tentar de novo (notas)" }))
	expect(onRetryNotas).toHaveBeenCalledTimes(1)
	expect(onRetryFeriados).not.toHaveBeenCalled()
})

test("erro de feriados mantém as notas visíveis e o retry chama só o dos feriados", async () => {
	const onRetryNotas = vi.fn()
	const onRetryFeriados = vi.fn()
	const user = userEvent.setup()
	renderAgenda({ notas: [criarNotaMock("2026-10-20", "Pernas")], feriadosStatus: "erro", onRetryNotas, onRetryFeriados })
	expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os feriados")
	expect(screen.getByRole("button", { name: "Selecionar 20 de outubro (nota)" })).toBeInTheDocument()
	await user.click(screen.getByRole("button", { name: "Tentar de novo (feriados)" }))
	expect(onRetryFeriados).toHaveBeenCalledTimes(1)
	expect(onRetryNotas).not.toHaveBeenCalled()
})

test("carregando de uma fonte mostra o status e não esconde a outra", () => {
	const { unmount } = renderAgenda({ notasStatus: "carregando", feriados: [FERIADO_12] })
	expect(screen.getByRole("status")).toHaveTextContent("Carregando notas")
	expect(screen.getByRole("button", { name: "Selecionar 12 de outubro (feriado)" })).toBeInTheDocument()
	unmount()
	renderAgenda({ feriadosStatus: "carregando", notas: [criarNotaMock("2026-10-20", "Pernas")] })
	expect(screen.getByRole("status")).toHaveTextContent("Carregando feriados")
	expect(screen.getByRole("button", { name: "Selecionar 20 de outubro (nota)" })).toBeInTheDocument()
})

test("mês sem feriados nem notas mostra 'Nenhuma nota ou feriado neste mês.'", () => {
	renderAgenda()
	expect(screen.getByText("Nenhuma nota ou feriado neste mês.")).toBeInTheDocument()
})

test("com as duas fontes em erro não mostra o texto de mês vazio", () => {
	renderAgenda({ notasStatus: "erro", feriadosStatus: "erro" })
	expect(screen.getAllByRole("alert")).toHaveLength(2)
	expect(screen.queryByText("Nenhuma nota ou feriado neste mês.")).not.toBeInTheDocument()
})
```

- **Step 2: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/model/fonte-status.test.ts`
Expected: FAIL: o módulo `./fonte-status` não existe.

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/month-agenda.test.tsx`
Expected: FAIL: o módulo `./month-agenda` não existe.

- **Step 3: Implement `fonte-status.ts` in `apps/frontend/src/features/calendario-feriados/model/fonte-status.ts`**

`statusDaFonte(input: { isPending: boolean; isError: boolean; hasData: boolean }): FonteStatus`: "carregando" = `isPending && !hasData`; "erro" = `isError && !hasData`; qualquer outra combinação (inclusive falha de refetch com dados) é "ok". Exporte `FonteStatus` e as sete constantes de texto com os valores literais listados em `## Interfaces`.

- **Step 4: Run the fonte-status test**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/model/fonte-status.test.ts`
Expected: PASS: 5 testes.

- **Step 5: Implement `MonthAgenda(props: MonthAgendaProps)` in `apps/frontend/src/features/calendario-feriados/ui/month-agenda.tsx`**

`"use client"`, recebe dados prontos (não conhece queries). Regras:

- Lista única: junta feriados e notas, ordena por data crescente e, no mesmo dia, feriado antes da nota; sem agrupar por semana. As entradas podem chegar fora de ordem.
- Contêiner rolável com `data-testid="month-agenda-lista"` e classes `min-h-0 flex-1 overflow-y-auto max-h-80 xl:max-h-none` (rola por dentro; empilhado abaixo de 1280px a altura é limitada), com gradiente de fade no fim.
- Cada linha é um `<button type="button">` que chama `onSelectDay(data)`, com `aria-label` `"Selecionar {formatarDataCurta(data)} (feriado)"` ou `"... (nota)"` e `aria-current="true"` quando `data === selectedDate`. Chip de data `dd/mm` em `font-display`; feriado: nome + subtítulo `nacional · {diaDaSemana(data)}`, borda esquerda `border-warning`; nota: texto em uma linha com reticências (`truncate`), borda esquerda `border-accent`.
- Rótulo `"No mês · {n} feriado(s) · {m} nota(s)"` com plural real: `1 feriado`/`2 feriados`/`0 feriados`, `1 nota`/`2 notas`/`0 notas`. O segmento de uma fonte cujo status não é "ok" é omitido; sem nenhum segmento, o rótulo não aparece.
- Estados por fonte, sem esconder a outra: `carregando` -> `<p role="status">` com `MSG_CARREGANDO_NOTAS`/`MSG_CARREGANDO_FERIADOS`; `erro` -> `<div role="alert">` com `MSG_ERRO_NOTAS`/`MSG_ERRO_FERIADOS` e `Button variant="outline" size="sm"` com texto `TEXTO_TENTAR_DE_NOVO` e `aria-label` `ARIA_TENTAR_DE_NOVO_NOTAS`/`ARIA_TENTAR_DE_NOVO_FERIADOS` chamando o retry daquela fonte.
- Ambas as fontes "ok" e sem itens: `"Nenhuma nota ou feriado neste mês."`.
- Biome: complexidade cognitiva máxima 5; extraia `mesclarEntradas(feriados, notas)`, `LinhaDoMes`, `EstadoDaFonte` e o rótulo em helpers/subcomponentes.

- **Step 6: Run the agenda tests**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/ui/month-agenda.test.tsx`
Expected: PASS: 9 testes.

- **Step 7: Commit** *(somente quando `workflow.auto_commit` for true; senão reporte os arquivos)*

```bash
git add apps/frontend/src/features/calendario-feriados/model/fonte-status.ts apps/frontend/src/features/calendario-feriados/model/fonte-status.test.ts apps/frontend/src/features/calendario-feriados/ui/month-agenda.tsx apps/frontend/src/features/calendario-feriados/ui/month-agenda.test.tsx
git commit -m "feat(calendario): lista do mes com feriados e notas"
```

## Critérios de Sucesso

- AC-10 [unit]: WHEN o mês tem muitas notas THEN a lista do mês rola dentro do painel e a altura do painel não aumenta
- AC-11 [unit]: WHEN o usuário clica em uma linha da lista do mês THEN o dia daquela linha fica selecionado
- AC-12 [unit]: WHEN a lista do mês é exibida THEN feriados e notas aparecem juntos em ordem cronológica, com o feriado antes da nota no mesmo dia
- Cada fonte mostra carregando ou erro com "Tentar de novo" só para ela, e a outra segue visível (FR-016; o AC-13 em nível de página é da task-06).
