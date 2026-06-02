import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { SearchBar } from "./search-bar"

describe("SearchBar", () => {
	test("chama onClick ao clicar no wrapper quando onClick é fornecido", async () => {
		const onClick = vi.fn()
		render(<SearchBar onClick={onClick} placeholder="buscar" />)
		await userEvent.click(screen.getByRole("presentation"))
		expect(onClick).toHaveBeenCalledTimes(1)
	})

	test("não renderiza role presentation quando onClick não é fornecido", () => {
		render(<SearchBar placeholder="buscar" />)
		expect(screen.queryByRole("presentation")).not.toBeInTheDocument()
		expect(screen.getByPlaceholderText("buscar")).toBeInTheDocument()
	})
})
