import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { WeatherSearchForm } from "./weather-search-form"

describe("WeatherSearchForm", () => {
	test("chama onSearch com a cidade digitada ao submeter", async () => {
		const user = userEvent.setup()
		const onSearch = vi.fn()
		render(<WeatherSearchForm onSearch={onSearch} isPending={false} />)

		await user.type(screen.getByLabelText("Cidade (obrigatório)"), "São Paulo")
		await user.click(screen.getByRole("button", { name: "Consultar" }))

		expect(onSearch).toHaveBeenCalledWith("São Paulo")
	})

	test("mostra erro e não chama onSearch ao submeter vazio", async () => {
		const user = userEvent.setup()
		const onSearch = vi.fn()
		render(<WeatherSearchForm onSearch={onSearch} isPending={false} />)

		await user.click(screen.getByRole("button", { name: "Consultar" }))

		expect(
			await screen.findByText("Informe o nome de uma cidade."),
		).toBeInTheDocument()
		expect(onSearch).not.toHaveBeenCalled()
	})

	test("desabilita o botão e mostra 'Consultando…' quando isPending é true", () => {
		render(<WeatherSearchForm onSearch={vi.fn()} isPending={true} />)

		const button = screen.getByRole("button", { name: "Consultando…" })
		expect(button).toBeDisabled()
		expect(button).toHaveTextContent("Consultando…")
	})

	test("não chama onSearch ao submeter via Enter enquanto isPending é true", async () => {
		const user = userEvent.setup()
		const onSearch = vi.fn()
		render(<WeatherSearchForm onSearch={onSearch} isPending={true} />)

		await user.type(screen.getByLabelText("Cidade (obrigatório)"), "São Paulo")
		await user.keyboard("{Enter}")

		expect(onSearch).not.toHaveBeenCalled()
	})
})
