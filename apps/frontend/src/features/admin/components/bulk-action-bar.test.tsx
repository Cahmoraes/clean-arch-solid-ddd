import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { BulkActionBar } from "./bulk-action-bar"

describe("BulkActionBar", () => {
	test("não renderiza nada quando selectedCount é 0", () => {
		const { container } = render(
			<BulkActionBar
				selectedCount={0}
				onActivate={vi.fn()}
				onDeactivate={vi.fn()}
				onClear={vi.fn()}
			/>,
		)

		expect(container).toBeEmptyDOMElement()
	})

	test("renderiza a contagem e os 3 botões quando selectedCount é maior que 0", () => {
		render(
			<BulkActionBar
				selectedCount={3}
				onActivate={vi.fn()}
				onDeactivate={vi.fn()}
				onClear={vi.fn()}
			/>,
		)

		expect(screen.getByText("3 selecionados")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Ativar" })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Desativar" }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Limpar seleção" }),
		).toBeInTheDocument()
	})

	test("usa o singular 'selecionado' quando selectedCount é 1", () => {
		render(
			<BulkActionBar
				selectedCount={1}
				onActivate={vi.fn()}
				onDeactivate={vi.fn()}
				onClear={vi.fn()}
			/>,
		)

		expect(screen.getByText("1 selecionado")).toBeInTheDocument()
	})

	test("cada botão chama seu respectivo callback ao clicar", async () => {
		const user = userEvent.setup()
		const onActivate = vi.fn()
		const onDeactivate = vi.fn()
		const onClear = vi.fn()

		render(
			<BulkActionBar
				selectedCount={2}
				onActivate={onActivate}
				onDeactivate={onDeactivate}
				onClear={onClear}
			/>,
		)

		await user.click(screen.getByRole("button", { name: "Ativar" }))
		expect(onActivate).toHaveBeenCalledTimes(1)

		await user.click(screen.getByRole("button", { name: "Desativar" }))
		expect(onDeactivate).toHaveBeenCalledTimes(1)

		await user.click(screen.getByRole("button", { name: "Limpar seleção" }))
		expect(onClear).toHaveBeenCalledTimes(1)
	})
})
