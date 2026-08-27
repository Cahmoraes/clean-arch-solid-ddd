import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { CheckInSearchInput } from "./check-in-search-input"

describe("CheckInSearchInput", () => {
	test("renderiza o campo de busca com placeholder", () => {
		render(
			<CheckInSearchInput
				value=""
				onChange={vi.fn()}
				placeholder="Buscar academia..."
				label="Buscar check-in por academia"
			/>,
		)
		expect(
			screen.getByPlaceholderText("Buscar academia..."),
		).toBeInTheDocument()
	})

	test("exibe o valor atual no input", () => {
		render(
			<CheckInSearchInput
				value="SmartFit"
				onChange={vi.fn()}
				placeholder="Buscar academia..."
				label="Buscar check-in por academia"
			/>,
		)
		expect(screen.getByDisplayValue("SmartFit")).toBeInTheDocument()
	})

	test("chama onChange ao digitar", async () => {
		const onChange = vi.fn()
		render(
			<CheckInSearchInput
				value=""
				onChange={onChange}
				placeholder="Buscar academia..."
				label="Buscar check-in por academia"
			/>,
		)
		await userEvent.type(screen.getByPlaceholderText("Buscar academia..."), "a")
		expect(onChange).toHaveBeenCalled()
	})

	test("exibe botão de limpar quando há valor e chama onChange com vazio ao clicar", async () => {
		const onChange = vi.fn()
		render(
			<CheckInSearchInput
				value="SmartFit"
				onChange={onChange}
				placeholder="Buscar academia..."
				label="Buscar check-in por academia"
			/>,
		)
		const clearButton = screen.getByRole("button", { name: /limpar busca/i })
		expect(clearButton).toBeInTheDocument()
		await userEvent.click(clearButton)
		expect(onChange).toHaveBeenCalledWith("")
	})

	test("não exibe botão de limpar quando valor está vazio", () => {
		render(
			<CheckInSearchInput
				value=""
				onChange={vi.fn()}
				placeholder="Buscar academia..."
				label="Buscar check-in por academia"
			/>,
		)
		expect(
			screen.queryByRole("button", { name: /limpar busca/i }),
		).not.toBeInTheDocument()
	})

	test("expõe rótulo acessível via prop label", () => {
		render(
			<CheckInSearchInput
				value=""
				onChange={vi.fn()}
				placeholder="Buscar academia..."
				label="Buscar check-in por academia"
			/>,
		)
		expect(
			screen.getByRole("textbox", { name: "Buscar check-in por academia" }),
		).toBeInTheDocument()
	})

	test("reforça o anel de foco (contraste) no wrapper e remove do input (cobre ícone junto)", () => {
		render(
			<CheckInSearchInput
				value=""
				onChange={vi.fn()}
				placeholder="Buscar academia..."
				label="Buscar check-in por academia"
			/>,
		)
		const input = screen.getByRole("textbox", {
			name: "Buscar check-in por academia",
		})
		expect(input).not.toHaveClass("focus-ring-duplo")
		expect(input).toHaveClass("outline-none")
		expect(input.parentElement).toHaveClass("focus-ring-duplo")
	})

	test("botão limpar busca atinge o alvo mínimo de toque (24x24px)", () => {
		render(
			<CheckInSearchInput
				value="SmartFit"
				onChange={vi.fn()}
				placeholder="Buscar academia..."
				label="Buscar check-in por academia"
			/>,
		)
		const clearButton = screen.getByRole("button", { name: /limpar busca/i })
		expect(clearButton).toHaveClass("h-6")
		expect(clearButton).toHaveClass("w-6")
	})
})
