import { screen, within } from "@testing-library/react"
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

const FERIADO = {
	date: "2026-10-12",
	name: "Nossa Senhora Aparecida",
	type: "national",
	isNational: true,
} as const

const notas = { "2026-10-12": "treino com os irmãos" }

function renderCalendario({
	feriados,
	notas: notasDoMes,
}: {
	feriados: (typeof FERIADO)[]
	notas: Record<string, string>
}) {
	return renderWithProviders(
		<MonthlyCalendar
			monthIndex={9}
			year={2026}
			feriados={feriados}
			notas={notasDoMes}
			onPrevMonth={vi.fn()}
			onNextMonth={vi.fn()}
		/>,
	)
}

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

	test("AC-02 o dia selecionado tem aria-pressed e os demais não", () => {
		const { container } = renderWithProviders(
			<MonthlyCalendar
				monthIndex={9}
				year={2026}
				feriados={[]}
				onPrevMonth={vi.fn()}
				onNextMonth={vi.fn()}
				selectedDate="2026-10-12"
			/>,
		)
		const selecionado = container.querySelector(
			'button[data-date="2026-10-12"]',
		)
		const outro = container.querySelector('button[data-date="2026-10-13"]')
		expect(selecionado).toHaveAttribute("aria-pressed", "true")
		expect(outro).toHaveAttribute("aria-pressed", "false")
	})

	test("AC-01 a célula não contém o texto do feriado nem da nota, só o número e marcadores", () => {
		const { container } = renderCalendario({ feriados: [FERIADO], notas })
		const celula = container.querySelector(
			'button[data-date="2026-10-12"]',
		) as HTMLElement
		expect(celula).toHaveTextContent(/^12$/)
		expect(
			within(celula).queryByText("Nossa Senhora Aparecida"),
		).not.toBeInTheDocument()
		expect(
			within(celula).queryByText("treino com os irmãos"),
		).not.toBeInTheDocument()
		expect(
			within(celula).getByTestId("marcador-feriado-2026-10-12"),
		).toBeInTheDocument()
		expect(
			within(celula).getByTestId("marcador-nota-2026-10-12"),
		).toBeInTheDocument()
	})

	test("AC-01 dia só com nota tem só o losango, dia só com feriado tem só o quadrado e dia comum não tem marcador", () => {
		renderCalendario({ feriados: [FERIADO], notas: { "2026-10-20": "Pernas" } })
		expect(screen.getByTestId("marcador-nota-2026-10-20")).toBeInTheDocument()
		expect(
			screen.queryByTestId("marcador-feriado-2026-10-20"),
		).not.toBeInTheDocument()
		expect(
			screen.getByTestId("marcador-feriado-2026-10-12"),
		).toBeInTheDocument()
		expect(
			screen.queryByTestId("marcador-nota-2026-10-12"),
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId("marcador-feriado-2026-10-13"),
		).not.toBeInTheDocument()
		expect(
			screen.queryByTestId("marcador-nota-2026-10-13"),
		).not.toBeInTheDocument()
	})

	test("AC-15 mantém data-date, aria-current e o aria-label com dia, feriado e nota; marcadores são aria-hidden", () => {
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date(2026, 9, 12, 12, 0, 0))

		try {
			const { container } = renderCalendario({ feriados: [FERIADO], notas })
			const celula = container.querySelector(
				'button[data-date="2026-10-12"]',
			) as HTMLElement
			expect(celula).toHaveAttribute("aria-current", "date")
			expect(celula).toHaveAttribute(
				"aria-label",
				"12 de outubro: Nossa Senhora Aparecida, feriado nacional de 2026, nota: treino com os irmãos",
			)
			expect(
				screen
					.getByTestId("marcador-feriado-2026-10-12")
					.closest('[aria-hidden="true"]'),
			).not.toBeNull()
			expect(
				screen
					.getByTestId("marcador-nota-2026-10-12")
					.closest('[aria-hidden="true"]'),
			).not.toBeNull()
		} finally {
			vi.useRealTimers()
		}
	})

	test("AC-15 o tooltip mostra feriado e nota, nessa ordem, ao passar o mouse", async () => {
		const user = userEvent.setup()
		const { container } = renderCalendario({ feriados: [FERIADO], notas })
		await user.hover(
			container.querySelector('button[data-date="2026-10-12"]') as HTMLElement,
		)
		const tooltip = await screen.findByRole("tooltip")
		expect(tooltip).toHaveTextContent("Nossa Senhora Aparecida")
		expect(tooltip).toHaveTextContent("treino com os irmãos")
		expect(
			tooltip.textContent?.indexOf("Nossa Senhora Aparecida"),
		).toBeLessThan(tooltip.textContent?.indexOf("treino com os irmãos") ?? -1)
	})

	test("AC-15 o tooltip de um dia só com nota abre ao focar o dia", async () => {
		const user = userEvent.setup()
		const { container } = renderCalendario({
			feriados: [],
			notas: { "2026-10-20": "Pernas" },
		})
		const celula = container.querySelector(
			'button[data-date="2026-10-20"]',
		) as HTMLElement
		while (document.activeElement !== celula) await user.tab()
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Pernas")
	})

	test("AC-15 a célula do dia não é remontada quando a nota chega depois", () => {
		const props = {
			monthIndex: 9,
			year: 2026,
			feriados: [],
			onPrevMonth: vi.fn(),
			onNextMonth: vi.fn(),
		}
		const { container, rerender } = renderWithProviders(
			<MonthlyCalendar {...props} notas={{}} />,
		)
		const antes = container.querySelector('button[data-date="2026-10-20"]')
		rerender(<MonthlyCalendar {...props} notas={{ "2026-10-20": "Pernas" }} />)
		const depois = container.querySelector('button[data-date="2026-10-20"]')
		expect(depois).toBe(antes)
	})

	test("AC-15 dia comum focado não aponta para um tooltip inexistente", async () => {
		const user = userEvent.setup()
		const { container } = renderCalendario({ feriados: [], notas: {} })
		const diaComum = container.querySelector(
			'button[data-date="2026-10-13"]',
		) as HTMLElement
		while (document.activeElement !== diaComum) await user.tab()
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
		expect(diaComum).not.toHaveAttribute("aria-describedby")
	})
})
