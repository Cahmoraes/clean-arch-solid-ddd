# Task 1: Grid do mês — introduz destaque do dia atual e aumenta as células [FR-001, FR-002, FR-005]

**Status:** PENDING
**PRD:** `../prd/prd-calendario-refinamento-visual.md`
**Spec:** `../specs/calendario-refinamento-visual-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

O grid do mês (`MonthlyCalendar`) hoje só destaca dias de feriado (`border-primary bg-primary/10`).
Esta task introduz o destaque do **dia atual** (funcionalidade nova — não existe hoje, nem
`aria-current`, nem lógica de "hoje" no componente), reaproveitando a mesma classe visual do
feriado (cor primária mutuamente exclusiva com qualquer outro estado do grid), e aumenta a
altura mínima das células de `min-h-10` para `min-h-14`. Nenhuma biblioteca de data é
introduzida — a comparação usa `Date` nativo, como o resto do arquivo.

## Arquivos

- Modify: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`
- Modify: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx`

### Conformidade com as Skills Padrão

- `wcag-audit-patterns`: a task introduz `aria-current="date"` novo e precisa nascer acessível (estado não pode depender só de cor).
- `tailwindcss`: ajuste de classes utilitárias (`min-h-14`, condição de `border-primary`/`bg-primary/10`) em Tailwind v4.
- `vercel-react-best-practices`: componente React de renderização de lista (`renderDayCells`) — evitar recomputações desnecessárias e manter o padrão idiomático do projeto.
- `test-antipatterns`: o teste novo usa `vi.useFakeTimers`/`vi.setSystemTime` — evitar acoplar o teste a comportamento incidental do relógio real ou a detalhes de implementação em vez do comportamento observável (aria-current, classe visual).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-refinamento-visual-visual.md` (seção "Núcleo HTML/JSX representativo" — célula do grid com `data-state="feriado"`; o mesmo padrão visual se aplica ao estado "hoje").
- **Fonte de design original:** nenhuma — seguir o mockup curado.
- **Confirmar com o usuário:** não há fonte de design original a confirmar (já registrado no spec).
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de design-to-code ou regressão visual configurada neste repositório — construir manualmente a partir do mockup e do código existente.
- **Decisões visuais já tomadas (não refazer):** cor primária (`--color-primary #39e58c`) reservada exclusivamente para "hoje" e "feriado"; nenhuma outra classe decorativa deve usar essa cor no grid.

## Passos

- **Step 1: Escrever o teste que falha para o destaque do dia atual**

Adicionar ao final de `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx` (mesmo arquivo dos testes existentes, mesmos imports já presentes: `render`, `screen` de `@testing-library/react`, `describe`/`expect`/`test` do pacote de testes, `MonthlyCalendar` local — adicionar `vi` ao import do pacote de testes):

```typescript
import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { MonthlyCalendar } from "./monthly-calendar"

// ... (testes existentes permanecem inalterados) ...

test("destaca o dia atual com aria-current e a mesma cor primária do feriado", () => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date(2026, 8, 7, 12, 0, 0))

	try {
		render(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)

		const todayCell = screen.getByLabelText("7 de setembro")
		expect(todayCell).toHaveAttribute("aria-current", "date")
		expect(todayCell).toHaveClass("border-primary", "bg-primary/10")
	} finally {
		vi.useRealTimers()
	}
})
```

- **Step 2: Rodar o teste para confirmar que falha**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
Expected: FAIL — `getByLabelText("7 de setembro")` encontra o elemento (o `aria-label` já existe para dias sem feriado), mas `expect(todayCell).toHaveAttribute("aria-current", "date")` falha porque o atributo não existe ainda.

- **Step 3: Implementar o destaque do dia atual e aumentar a célula**

Em `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`, adicionar uma função auxiliar (perto de `renderDayCells`) e atualizar `DayCell` e `renderDayCells`:

```typescript
function getTodayDateStr(): string {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function DayCell({
	day,
	holiday,
	isToday,
	monthNameLower,
}: {
	day: number
	holiday?: Feriado
	isToday: boolean
	monthNameLower: string
}) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: gridcell semantics required
		<div
			role="gridcell"
			tabIndex={-1}
			aria-current={isToday ? "date" : undefined}
			aria-label={
				holiday
					? formatHolidayAriaLabel(holiday)
					: `${day} de ${monthNameLower}`
			}
			className={cn(
				"flex min-h-14 flex-col items-center justify-center rounded-md border p-1 text-sm",
				holiday || isToday ? "border-primary bg-primary/10" : "border-transparent",
			)}
		>
			<span className="block font-mono leading-none">{day}</span>
			{holiday ? (
				<span
					className="mt-1 line-clamp-2 block text-center text-[7px] leading-tight"
					data-name={holiday.name}
				>
					{holiday.name}
				</span>
			) : null}
		</div>
	)
}

function renderDayCells(
	year: number,
	monthIndex: number,
	holidaysByDate: Map<string, Feriado>,
	monthNameLower: string,
) {
	const daysInMonth = getDaysInMonth(year, monthIndex)
	const todayStr = getTodayDateStr()
	return Array.from({ length: daysInMonth }, (_, index) => {
		const day = index + 1
		const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
		const holiday = holidaysByDate.get(dateStr)
		return (
			<DayCell
				key={dateStr}
				day={day}
				holiday={holiday}
				isToday={dateStr === todayStr}
				monthNameLower={monthNameLower}
			/>
		)
	})
}
```

Não alterar `getDaysInMonth`, `formatHolidayAriaLabel`, os imports existentes, nem a montagem de `holidaysByDate` no componente pai — só os dois trechos acima.

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
Expected: PASS — todos os testes do arquivo (os 3 já existentes + o novo) passam.

- **Step 5: Commit** *(execução sequencial — se esta task rodar em uma wave paralela, pular este passo e reportar os arquivos alterados em vez de commitar)*

```bash
git add apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx
git commit -m "feat(calendario): destaca dia atual e aumenta celulas do grid"
```

## Critérios de Sucesso

- O dia atual do mês exibido recebe `aria-current="date"` e a mesma classe visual (`border-primary bg-primary/10`) usada no feriado (FR-001, FR-005).
- Nenhum outro estado do grid usa `border-primary`/`bg-primary` (FR-001).
- As células do grid têm `min-h-14` em vez de `min-h-10` (FR-002).
- Os 3 testes já existentes em `monthly-calendar.test.tsx` continuam passando sem modificação de asserção (nenhuma regressão nos atributos `role="grid"`/`gridcell`/`aria-label` já cobertos).
