import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { SearchBar } from "./search-bar"

describe("SearchBar", () => {
	test("chama onClick ao clicar no wrapper quando onClick é fornecido", async () => {
		const onClick = vi.fn()
		render(<SearchBar onClick={onClick} placeholder="buscar" />)
		await userEvent.click(screen.getByRole("button"))
		expect(onClick).toHaveBeenCalledTimes(1)
	})

	test("chama onClick ao pressionar Enter no wrapper", async () => {
		const onClick = vi.fn()
		render(<SearchBar onClick={onClick} placeholder="buscar" />)
		screen.getByRole("button").focus()
		await userEvent.keyboard("{Enter}")
		expect(onClick).toHaveBeenCalledTimes(1)
	})

	test("não renderiza role button quando onClick não é fornecido", () => {
		render(<SearchBar placeholder="buscar" />)
		expect(screen.queryByRole("button")).not.toBeInTheDocument()
		expect(screen.getByPlaceholderText("buscar")).toBeInTheDocument()
	})
})
