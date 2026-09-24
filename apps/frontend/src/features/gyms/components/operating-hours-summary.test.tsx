import { act, screen } from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { OperatingHoursSummary } from "./operating-hours-summary"

describe("OperatingHoursSummary", () => {
	test("exibe resumo compacto e badge Aberto agora", () => {
		const hours = [
			{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 6, intervals: [{ open: "08:00", close: "14:00" }] },
		]
		// 2026-01-05 é segunda 10:00 SP = 13:00 UTC
		const now = new Date(Date.UTC(2026, 0, 5, 13, 0, 0))
		const { getByText } = renderWithProviders(
			<OperatingHoursSummary operatingHours={hours} now={now} />,
		)
		expect(getByText(/Aberto agora/i)).toBeInTheDocument()
		// resumo compacto deve conter Seg e horário
		expect(getByText(/Seg.*06:00/i)).toBeInTheDocument()
		expect(getByText(/Fecha às 22:00/i)).toBeInTheDocument()
	})

	test("exibe badge Fechado e Abre às quando fora do horário", () => {
		const hours = [
			{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] },
		]
		// 23:00 SP segunda = 02:00 UTC terça
		const now = new Date(Date.UTC(2026, 0, 6, 2, 0, 0))
		renderWithProviders(
			<OperatingHoursSummary operatingHours={hours} now={now} />,
		)
		expect(screen.getByTestId("operating-hours-badge")).toHaveTextContent(
			/Fechado/i,
		)
		expect(screen.getByText(/Abre às/i)).toBeInTheDocument()
	})

	test("exibe Horário não informado quando null", () => {
		const { getByText } = renderWithProviders(
			<OperatingHoursSummary operatingHours={null} />,
		)
		expect(getByText(/Horário não informado/i)).toBeInTheDocument()
	})

	test("exibe Horário não informado quando array vazio", () => {
		const { getByText } = renderWithProviders(
			<OperatingHoursSummary operatingHours={[]} />,
		)
		expect(getByText(/Horário não informado/i)).toBeInTheDocument()
	})

	test("exibe Horário não informado quando undefined", () => {
		const { getByText } = renderWithProviders(
			<OperatingHoursSummary operatingHours={undefined} />,
		)
		expect(getByText(/Horário não informado/i)).toBeInTheDocument()
	})

	test("renderiza tabela expansível com 7 linhas e today highlight", () => {
		const hours = [
			{ weekday: 0, intervals: [] },
			{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 2, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 3, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 4, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 5, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 6, intervals: [{ open: "08:00", close: "14:00" }] },
		]
		// Segunda 10:00 SP
		const now = new Date(Date.UTC(2026, 0, 5, 13, 0, 0))
		renderWithProviders(
			<OperatingHoursSummary operatingHours={hours} now={now} />,
		)
		expect(screen.getByText("Horário de funcionamento")).toBeInTheDocument()
		expect(screen.getByText("Ver horários completos ▾")).toBeInTheDocument()
		// 7 linhas
		for (let w = 0; w < 7; w++) {
			expect(screen.getByTestId(`operating-hours-row-${w}`)).toBeInTheDocument()
		}
		// today highlight: segunda (weekday 1) deve ter fundo destaque
		const mondayRow = screen.getByTestId("operating-hours-row-1")
		expect(mondayRow.className).toContain("bg-accent/10")
		// Dom fechado
		expect(screen.getByTestId("operating-hours-row-0")).toHaveTextContent(
			"Fechado",
		)
	})

	test("badge correto em bordas 21:59 aberto, 22:01 fechado com America/Sao_Paulo", () => {
		const hours = [
			{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] },
		]
		// 21:59 SP segunda = 00:59 UTC terça
		const openBorder = new Date(Date.UTC(2026, 0, 6, 0, 59, 0))
		const { rerender } = renderWithProviders(
			<OperatingHoursSummary operatingHours={hours} now={openBorder} />,
		)
		expect(screen.getByTestId("operating-hours-badge")).toHaveTextContent(
			/Aberto agora/,
		)
		expect(screen.getByText(/Fecha às 22:00/)).toBeInTheDocument()

		// 22:01 SP segunda = 01:01 UTC terça -> fechado
		const closedBorder = new Date(Date.UTC(2026, 0, 6, 1, 1, 0))
		rerender(
			<OperatingHoursSummary operatingHours={hours} now={closedBorder} />,
		)
		expect(screen.getByTestId("operating-hours-badge")).toHaveTextContent(
			/Fechado/,
		)
	})

	test("exibe resumo agrupado Seg–Sex quando mesmo horário", () => {
		const hours = [
			{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 2, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 3, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 4, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 5, intervals: [{ open: "06:00", close: "22:00" }] },
			{ weekday: 6, intervals: [{ open: "08:00", close: "14:00" }] },
		]
		const now = new Date(Date.UTC(2026, 0, 5, 13, 0, 0))
		renderWithProviders(
			<OperatingHoursSummary operatingHours={hours} now={now} />,
		)
		const compact = screen.getByTestId("operating-hours-compact")
		expect(compact.textContent).toContain("Seg–Sex 06:00–22:00")
		expect(compact.textContent).toContain("Sáb 08:00–14:00")
	})

	test("badge Abre às mostra próximo horário do dia quando fechado antes de abrir", () => {
		const hours = [
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "14:00", close: "18:00" },
				],
			},
		]
		// 13:00 SP segunda = 16:00 UTC -> entre intervalos, fechado, abre 14:00
		const now = new Date(Date.UTC(2026, 0, 5, 16, 0, 0))
		renderWithProviders(
			<OperatingHoursSummary operatingHours={hours} now={now} />,
		)
		expect(screen.getByTestId("operating-hours-badge")).toHaveTextContent(
			/Fechado/,
		)
		expect(screen.getByText("Abre às 14:00")).toBeInTheDocument()
	})

	test("atualiza o status na próxima virada de minuto sem override de now", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(Date.UTC(2026, 0, 6, 0, 59, 30)))

		try {
			const hours = [
				{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] },
			]
			renderWithProviders(<OperatingHoursSummary operatingHours={hours} />)

			expect(screen.getByTestId("operating-hours-badge")).toHaveTextContent(
				/Aberto agora/,
			)

			act(() => {
				vi.advanceTimersByTime(30_000)
			})

			expect(screen.getByTestId("operating-hours-badge")).toHaveTextContent(
				/Fechado/,
			)
		} finally {
			vi.useRealTimers()
		}
	})

	test("mantém o HTML inicial estável entre SSR e hidratação", async () => {
		const hours = [
			{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] },
		]
		vi.useFakeTimers()
		vi.setSystemTime(new Date(Date.UTC(2026, 0, 6, 0, 59, 59, 999)))

		const container = document.createElement("div")
		container.innerHTML = renderToString(
			<OperatingHoursSummary operatingHours={hours} />,
		)
		vi.setSystemTime(new Date(Date.UTC(2026, 0, 6, 1, 0, 0, 0)))

		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined)
		let root: ReturnType<typeof hydrateRoot> | undefined

		try {
			await act(async () => {
				root = hydrateRoot(
					container,
					<OperatingHoursSummary operatingHours={hours} />,
				)
			})
			expect(consoleError).not.toHaveBeenCalled()
		} finally {
			root?.unmount()
			consoleError.mockRestore()
			vi.useRealTimers()
		}
	})
})
