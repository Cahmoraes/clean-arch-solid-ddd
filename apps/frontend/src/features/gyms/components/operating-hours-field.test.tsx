import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { OperatingHoursField } from "./operating-hours-field"

describe("OperatingHoursField", () => {
	test("exibe 7 linhas Dom–Sáb", () => {
		renderWithProviders(<OperatingHoursField value={[]} onChange={vi.fn()} />)
		expect(screen.getByText("Domingo")).toBeInTheDocument()
		expect(screen.getByText("Segunda")).toBeInTheDocument()
		expect(screen.getByText("Terça")).toBeInTheDocument()
		expect(screen.getByText("Quarta")).toBeInTheDocument()
		expect(screen.getByText("Quinta")).toBeInTheDocument()
		expect(screen.getByText("Sexta")).toBeInTheDocument()
		expect(screen.getByText("Sábado")).toBeInTheDocument()
		// 7 toggles Fechado
		expect(screen.getAllByLabelText(/Fechado/i)).toHaveLength(7)
	})

	test("toggle Fechado limpa intervalos e chama onChange", async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		const value = [
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]
		renderWithProviders(
			<OperatingHoursField value={value} onChange={onChange} />,
		)
		// Segunda está aberta, checkbox desmarcado
		const toggle = screen.getByLabelText("Segunda Fechado")
		expect(toggle).not.toBeChecked()
		await user.click(toggle)
		expect(onChange).toHaveBeenCalledTimes(1)
		// ao fechar, remove o dia
		expect(onChange).toHaveBeenCalledWith([])
	})

	test("toggle Fechado desmarcado adiciona intervalo padrão", async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		renderWithProviders(<OperatingHoursField value={[]} onChange={onChange} />)
		const toggle = screen.getByLabelText("Segunda Fechado")
		expect(toggle).toBeChecked()
		await user.click(toggle)
		expect(onChange).toHaveBeenCalledTimes(1)
		const arg = onChange.mock.calls[0][0]
		expect(arg).toEqual([
			{ weekday: 1, intervals: [{ open: "08:00", close: "18:00" }] },
		])
	})

	test("exibe inputs type=time quando dia está aberto", () => {
		const value = [
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]
		renderWithProviders(
			<OperatingHoursField value={value} onChange={vi.fn()} />,
		)
		expect(screen.getByLabelText("Segunda abertura 1")).toBeInTheDocument()
		expect(screen.getByLabelText("Segunda fechamento 1")).toBeInTheDocument()
		expect(screen.getByLabelText("Segunda abertura 1")).toHaveAttribute(
			"type",
			"time",
		)
		expect(screen.getByLabelText("Segunda fechamento 1")).toHaveAttribute(
			"type",
			"time",
		)
	})

	test("renderiza dia fechado retornado pela API com intervals vazio", () => {
		renderWithProviders(
			<OperatingHoursField
				value={[{ weekday: 1, intervals: [] }]}
				onChange={vi.fn()}
			/>,
		)

		expect(screen.getByLabelText("Segunda Fechado")).toBeChecked()
		expect(
			screen.queryByLabelText("Segunda abertura 1"),
		).not.toBeInTheDocument()
	})

	test("substitui schedule vazio ao reabrir dia retornado pela API", async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		renderWithProviders(
			<OperatingHoursField
				value={[{ weekday: 1, intervals: [] }]}
				onChange={onChange}
			/>,
		)

		await user.click(screen.getByLabelText("Segunda Fechado"))

		expect(onChange).toHaveBeenCalledWith([
			{ weekday: 1, intervals: [{ open: "08:00", close: "18:00" }] },
		])
	})

	test("botão + intervalo adiciona até max 3 por dia", async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		const value = [
			{
				weekday: 1,
				intervals: [
					{ open: "06:00", close: "08:00" },
					{ open: "09:00", close: "11:00" },
				],
			},
		]
		const { rerender } = renderWithProviders(
			<OperatingHoursField value={value} onChange={onChange} />,
		)
		const addBtn = screen.getByLabelText("Adicionar intervalo em Segunda")
		expect(addBtn).not.toBeDisabled()
		await user.click(addBtn)
		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange.mock.calls[0][0][0].intervals).toHaveLength(3)

		// rerender com 3 intervalos -> botão desabilitado
		const fullValue = [
			{
				weekday: 1,
				intervals: [
					{ open: "06:00", close: "08:00" },
					{ open: "09:00", close: "11:00" },
					{ open: "12:00", close: "14:00" },
				],
			},
		]
		rerender(<OperatingHoursField value={fullValue} onChange={onChange} />)
		expect(
			screen.getByLabelText("Adicionar intervalo em Segunda"),
		).toBeDisabled()
		expect(screen.getByText("Máximo 3 intervalos")).toBeInTheDocument()
	})

	test("botão + intervalo usa seed sem sobrepor intervalos existentes", async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		const value = [
			{ weekday: 1, intervals: [{ open: "08:00", close: "18:00" }] },
		]
		renderWithProviders(
			<OperatingHoursField value={value} onChange={onChange} />,
		)

		await user.click(screen.getByLabelText("Adicionar intervalo em Segunda"))

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith([
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "18:00" },
					{ open: "18:00", close: "19:00" },
				],
			},
		])
	})

	test("exibe erro inline quando error prop é fornecido", () => {
		renderWithProviders(
			<OperatingHoursField
				value={[]}
				onChange={vi.fn()}
				error="Intervalos sobrepostos"
			/>,
		)
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Intervalos sobrepostos",
		)
	})

	test("exibe erro inline na linha do dia quando dayErrors é fornecido", () => {
		renderWithProviders(
			<OperatingHoursField
				value={[{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] }]}
				onChange={vi.fn()}
				dayErrors={{ 1: "Intervalos sobrepostos" }}
			/>,
		)
		expect(screen.getByTestId("day-row-1")).toHaveTextContent(
			"Intervalos sobrepostos",
		)
		expect(screen.getByLabelText("Segunda abertura 1")).toHaveAttribute(
			"aria-describedby",
			"operating-hours-1-error",
		)
	})

	test("editar horário chama onChange com novo valor", () => {
		const onChange = vi.fn()
		const value = [
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]
		renderWithProviders(
			<OperatingHoursField value={value} onChange={onChange} />,
		)
		const input = screen.getByLabelText("Segunda abertura 1")
		fireEvent.change(input, { target: { value: "07:00" } })
		expect(onChange).toHaveBeenCalled()
		const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
		expect(lastCall[0].intervals[0].open).toBe("07:00")
	})

	test("botão Remover aparece apenas com múltiplos intervalos", async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		const single = [
			{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }] },
		]
		const { rerender } = renderWithProviders(
			<OperatingHoursField value={single} onChange={onChange} />,
		)
		expect(
			screen.queryByLabelText("Remover intervalo 1 de Segunda"),
		).not.toBeInTheDocument()

		const multi = [
			{
				weekday: 1,
				intervals: [
					{ open: "08:00", close: "12:00" },
					{ open: "14:00", close: "18:00" },
				],
			},
		]
		rerender(<OperatingHoursField value={multi} onChange={onChange} />)
		expect(
			screen.getByLabelText("Remover intervalo 1 de Segunda"),
		).toBeInTheDocument()
		expect(
			screen.getByLabelText("Remover intervalo 2 de Segunda"),
		).toBeInTheDocument()
		await user.click(screen.getByLabelText("Remover intervalo 1 de Segunda"))
		expect(onChange).toHaveBeenCalled()
	})

	test("exibe 7 linhas e toggle Fechado limpa intervalos (caso do task)", async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		renderWithProviders(<OperatingHoursField value={[]} onChange={onChange} />)
		expect(screen.getByText("Segunda")).toBeInTheDocument()
		const toggle = screen.getByLabelText(/Segunda.*Fechado/i)
		await user.click(toggle)
		expect(onChange).toHaveBeenCalled()
	})
})
