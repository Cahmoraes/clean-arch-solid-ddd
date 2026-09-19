# Task 1: Tooltip no feriado e cor âmbar distinta do dia atual

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/calendario-tooltip-feriado-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Em `DayCell` do calendário mensal, o feriado passa a ter cor própria (âmbar, token `warning`) e um `Tooltip` com o nome ao passar o mouse; o dia atual mantém o verde (`primary`) e prevalece quando coincide com um feriado. Um único arquivo de produção e seu teste: os comportamentos são coesos (mesma célula, mesma função de classes) e ficam juntos, com um teste por comportamento.

**Ponto de partida:** existe um rascunho NÃO commitado e quebrado (JSX desbalanceado, `TooltipProvider` local) nos dois arquivos abaixo. Ele é descartado: comece de `HEAD` com `git restore apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx`. Só esses dois arquivos.

## Arquivos

- Modify: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`
- Test: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: o `Tooltip` vem do wrapper Radix em `@/components/ui/tooltip`; usar `TooltipTrigger asChild` sem criar provider (o global já existe).
- `tailwindcss`: classes de estado usam tokens do tema (`border-warning bg-warning/10`, `border-primary bg-primary/10`), sem hex hardcoded.
- `test-antipatterns`: testes afirmam comportamento real (classes aplicadas, tooltip exibido), sem mock do `Tooltip` e sem método só-de-teste.
- `wcag-audit-patterns`: `role="gridcell"`, `aria-label` e `aria-current="date"` ficam inalterados; o nome do feriado continua na célula (cor não é o único canal).
- `vercel-composition-patterns`: `DayCell` compõe `Tooltip` em volta da célula sem props booleanas novas.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-tooltip-feriado-visual.md` (baseline de cores e tooltip)
- **Fonte de design original:** nenhuma; seguir o mockup curado e o print do usuário (dia 19 atual, dia 7 feriado)
- **Confirmar com o usuário:** já confirmado na brainstorm (opção A, feriado âmbar); sem fonte externa
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir a partir do mockup
- **Decisões visuais já tomadas (não refazer):** feriado `border-warning bg-warning/10`; hoje `border-primary bg-primary/10`; hoje prevalece sobre feriado; tooltip com `TooltipContent` padrão; sem mudança de tamanho, raio ou tipografia

## Passos

- **Step 0: Confirmar fonte de design e ponto de partida**

Sem fonte de design original; seguir `../specs/mockups/calendario-tooltip-feriado-visual.md`. Descartar o rascunho:

```bash
git restore apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx
```

- **Step 1: Write the failing test**

Substituir todo o conteúdo de `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx` por (o `render` cru vira `renderWithProviders`, que inclui o `TooltipProvider`; o teste "mesma cor" é renomeado e passa a afirmar que hoje é verde):

```tsx
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { MonthlyCalendar } from "./monthly-calendar"

const independencia = {
	date: "2026-09-07",
	name: "Independência do Brasil",
	type: "national",
	isNational: true,
} as const

describe("MonthlyCalendar", () => {
	test("renderiza apenas o mês solicitado com feriado destacado", () => {
		renderWithProviders(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[independencia]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)
		expect(
			screen.getByRole("heading", { name: /Setembro 2026/ }),
		).toBeInTheDocument()
		expect(
			screen.getByLabelText(/7 de setembro.*Independência/),
		).toBeInTheDocument()
		expect(screen.queryByText("Outubro")).not.toBeInTheDocument()
	})

	test("setas têm aria-label com mês/ano alvo", () => {
		renderWithProviders(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /Mês anterior, agosto 2026/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Próximo mês, outubro 2026/ }),
		).toBeInTheDocument()
	})

	test("setas têm aria-label correto na virada de ano dez→jan e jan→dez", () => {
		const { rerender } = renderWithProviders(
			<MonthlyCalendar
				monthIndex={11}
				year={2026}
				feriados={[]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /Mês anterior, novembro 2026/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Próximo mês, janeiro 2027/ }),
		).toBeInTheDocument()

		rerender(
			<MonthlyCalendar
				monthIndex={0}
				year={2026}
				feriados={[]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /Mês anterior, dezembro 2025/ }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Próximo mês, fevereiro 2026/ }),
		).toBeInTheDocument()
	})

	test("destaca o dia atual com aria-current e cor primária", () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date(2026, 8, 19, 12, 0, 0))

		try {
			renderWithProviders(
				<MonthlyCalendar
					monthIndex={8}
					year={2026}
					feriados={[]}
					onPrevMonth={() => {}}
					onNextMonth={() => {}}
				/>,
			)

			const todayCell = screen.getByLabelText("19 de setembro")
			expect(todayCell).toHaveAttribute("aria-current", "date")
			expect(todayCell).toHaveClass("border-primary", "bg-primary/10")
		} finally {
			vi.useRealTimers()
		}
	})

	test("feriado usa cor âmbar distinta da cor primária do dia atual", () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date(2026, 8, 19, 12, 0, 0))

		try {
			renderWithProviders(
				<MonthlyCalendar
					monthIndex={8}
					year={2026}
					feriados={[independencia]}
					onPrevMonth={() => {}}
					onNextMonth={() => {}}
				/>,
			)

			const holidayCell = screen.getByLabelText(/7 de setembro.*Independência/)
			const todayCell = screen.getByLabelText("19 de setembro")
			expect(holidayCell).toHaveClass("border-warning", "bg-warning/10")
			expect(holidayCell).not.toHaveClass("border-primary")
			expect(todayCell).toHaveClass("border-primary", "bg-primary/10")
		} finally {
			vi.useRealTimers()
		}
	})

	test("dia que é feriado e hoje prevalece com a cor primária", () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date(2026, 8, 7, 12, 0, 0))

		try {
			renderWithProviders(
				<MonthlyCalendar
					monthIndex={8}
					year={2026}
					feriados={[independencia]}
					onPrevMonth={() => {}}
					onNextMonth={() => {}}
				/>,
			)

			const cell = screen.getByLabelText(/7 de setembro.*Independência/)
			expect(cell).toHaveAttribute("aria-current", "date")
			expect(cell).toHaveClass("border-primary", "bg-primary/10")
			expect(cell).not.toHaveClass("border-warning")
		} finally {
			vi.useRealTimers()
		}
	})

	test("exibe tooltip com o nome do feriado ao passar o mouse", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[independencia]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)

		await user.hover(screen.getByLabelText(/7 de setembro.*Independência/))

		expect(await screen.findByRole("tooltip")).toHaveTextContent(
			"Independência do Brasil",
		)
	})

	test("dia comum não exibe tooltip ao passar o mouse", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<MonthlyCalendar
				monthIndex={8}
				year={2026}
				feriados={[independencia]}
				onPrevMonth={() => {}}
				onNextMonth={() => {}}
			/>,
		)

		await user.hover(screen.getByLabelText("8 de setembro"))

		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run (em `apps/frontend`): `pnpm exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
Expected: FAIL. Os testes "feriado usa cor âmbar…", "dia que é feriado e hoje…" (classe `border-warning` ausente / feriado ainda `border-primary`) e "exibe tooltip…" (nenhum `role="tooltip"`) falham; 1 arquivo coletado.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`:

1. Após o import de `@/components/ui/card`, adicionar:

```tsx
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
```

2. Antes de `function DayCell(`, adicionar:

```tsx
function getDayCellStateClass(isHoliday: boolean, isToday: boolean): string {
	if (isToday) return "border-primary bg-primary/10"
	if (isHoliday) return "border-warning bg-warning/10"
	return "border-transparent"
}
```

3. Substituir a função `DayCell` inteira por:

```tsx
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
	const cell = (
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
				getDayCellStateClass(Boolean(holiday), isToday),
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

	if (!holiday) return cell

	return (
		<Tooltip>
			<TooltipTrigger asChild>{cell}</TooltipTrigger>
			<TooltipContent>{holiday.name}</TooltipContent>
		</Tooltip>
	)
}
```

Não adicionar `TooltipProvider` local nem mexer no JSX do grid: o provider global (`providers.tsx`) e o de `renderWithProviders` já cobrem app e testes.

- **Step 4: Run test to verify it passes**

Run (em `apps/frontend`): `pnpm exec vitest run src/features/calendario-feriados/ui/monthly-calendar.test.tsx`
Expected: PASS (7 testes, 1 arquivo).

- **Step 5: Commit** *(execução sequencial; em onda paralela o orquestrador commita na barreira)*

```bash
git add apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.test.tsx
git commit -m "feat(calendario): tooltip de feriado e cor distinta do dia atual"
```

## Critérios de Sucesso

- Dia de feriado tem `border-warning bg-warning/10` e não `border-primary`; o dia atual (relógio fixo) tem `border-primary bg-primary/10`.
- Dia que é feriado e hoje mostra as classes de hoje e `aria-current="date"`.
- Passar o mouse sobre o feriado exibe um `role="tooltip"` com o nome; dia comum não exibe tooltip.
- `aria-label`, `role="gridcell"` e o texto do feriado na célula permanecem inalterados.
- Nenhum `TooltipProvider` novo foi adicionado ao componente.
