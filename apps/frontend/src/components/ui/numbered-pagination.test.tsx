import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { NumberedPagination } from "./numbered-pagination"

describe("NumberedPagination", () => {
	test("renderiza testids com prefixo fornecido", () => {
		render(
			<NumberedPagination
				page={1}
				totalPages={3}
				onChange={vi.fn()}
				testIdPrefix="test"
			/>,
		)

		expect(screen.getByTestId("test-pagination")).toBeInTheDocument()
		expect(screen.getByTestId("test-prev")).toBeInTheDocument()
		expect(screen.getByTestId("test-page-1")).toBeInTheDocument()
		expect(screen.getByTestId("test-next")).toBeInTheDocument()
	})

	test("chama onChange com página clicada", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={1}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-page-2"))

		expect(onChange).toHaveBeenCalledWith(2)
	})

	test("chama onChange com página - 1 ao clicar anterior", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={2}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-prev"))

		expect(onChange).toHaveBeenCalledWith(1)
	})

	test("chama onChange com página + 1 ao clicar próximo", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={1}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-next"))

		expect(onChange).toHaveBeenCalledWith(2)
	})

	test("não vai abaixo de página 1 ao clicar anterior", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={1}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-prev"))

		expect(onChange).not.toHaveBeenCalled()
	})

	test("não vai acima de totalPages ao clicar próximo", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={3}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-next"))

		expect(onChange).not.toHaveBeenCalled()
	})

	test("remove foco dos controles nos limites da paginação", () => {
		const { rerender } = render(
			<NumberedPagination
				page={1}
				totalPages={3}
				onChange={vi.fn()}
				testIdPrefix="test"
			/>,
		)

		expect(screen.getByTestId("test-prev")).toHaveAttribute("tabindex", "-1")
		expect(screen.getByTestId("test-next")).not.toHaveAttribute(
			"tabindex",
			"-1",
		)

		rerender(
			<NumberedPagination
				page={3}
				totalPages={3}
				onChange={vi.fn()}
				testIdPrefix="test"
			/>,
		)

		expect(screen.getByTestId("test-prev")).not.toHaveAttribute(
			"tabindex",
			"-1",
		)
		expect(screen.getByTestId("test-next")).toHaveAttribute("tabindex", "-1")
	})

	test("marca página correta como ativa", () => {
		render(
			<NumberedPagination
				page={2}
				totalPages={5}
				onChange={vi.fn()}
				testIdPrefix="test"
			/>,
		)

		const page2 = screen.getByTestId("test-page-2")
		expect(page2).toHaveAttribute("aria-current", "page")
	})

	test("desabilita controles, remove foco e bloqueia navegação", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={2}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
				disabled
			/>,
		)

		const controls = [
			screen.getByTestId("test-prev"),
			screen.getByTestId("test-page-1"),
			screen.getByTestId("test-page-2"),
			screen.getByTestId("test-page-3"),
			screen.getByTestId("test-next"),
		]

		for (const control of controls) {
			expect(control).toHaveAttribute("aria-disabled", "true")
			expect(control).toHaveAttribute("tabindex", "-1")
			await user.click(control)
		}

		expect(onChange).not.toHaveBeenCalled()
	})

	test("mostra janela de máximo 5 páginas", () => {
		render(
			<NumberedPagination
				page={5}
				totalPages={10}
				onChange={vi.fn()}
				testIdPrefix="test"
			/>,
		)

		expect(screen.getByTestId("test-page-3")).toBeInTheDocument()
		expect(screen.getByTestId("test-page-7")).toBeInTheDocument()
		expect(screen.queryByTestId("test-page-1")).not.toBeInTheDocument()
		expect(screen.queryByTestId("test-page-10")).not.toBeInTheDocument()
	})
})
