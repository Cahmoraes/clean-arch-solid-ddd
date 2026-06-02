import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { SearchBar } from "./search-bar"

describe("SearchBar", () => {
	test("chama onActivate ao clicar no wrapper quando onActivate é fornecido", async () => {
		const onActivate = vi.fn()
		render(<SearchBar onActivate={onActivate} placeholder="buscar" />)
		await userEvent.click(screen.getByRole("button"))
		expect(onActivate).toHaveBeenCalledTimes(1)
	})

	test("chama onActivate ao pressionar Enter no wrapper", async () => {
		const onActivate = vi.fn()
		render(<SearchBar onActivate={onActivate} placeholder="buscar" />)
		screen.getByRole("button").focus()
		await userEvent.keyboard("{Enter}")
		expect(onActivate).toHaveBeenCalledTimes(1)
	})

	test("não renderiza como button quando onActivate não é fornecido", () => {
		render(<SearchBar placeholder="buscar" />)
		expect(screen.queryByRole("button")).not.toBeInTheDocument()
		expect(screen.getByPlaceholderText("buscar")).toBeInTheDocument()
	})
})
