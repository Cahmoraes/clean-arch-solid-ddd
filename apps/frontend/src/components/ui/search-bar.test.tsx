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

	test("renderiza só o botão-ícone quando compact é true, mesmo com showShortcut", () => {
		render(
			<SearchBar
				compact
				showShortcut
				onActivate={vi.fn()}
				placeholder="buscar"
			/>,
		)
		const button = screen.getByRole("button", { name: "Buscar" })
		expect(button).toBeInTheDocument()
		expect(screen.queryByText("buscar")).not.toBeInTheDocument()
		expect(screen.queryByText("⌘K")).not.toBeInTheDocument()
	})

	test("chama onActivate ao clicar no botão-ícone compacto", async () => {
		const onActivate = vi.fn()
		render(<SearchBar compact onActivate={onActivate} placeholder="buscar" />)
		await userEvent.click(screen.getByRole("button", { name: "Buscar" }))
		expect(onActivate).toHaveBeenCalledTimes(1)
	})

	test("expõe aria-label no botão quando onActivate é fornecido com showShortcut (bug do aria-label perdido)", () => {
		render(
			<SearchBar
				showShortcut
				placeholder="Buscar..."
				aria-label="Buscar"
				onActivate={vi.fn()}
			/>,
		)
		expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument()
	})

	test("usa o placeholder como aria-label de fallback no botão quando onActivate é fornecido sem aria-label explícito", () => {
		render(<SearchBar placeholder="Buscar academia" onActivate={vi.fn()} />)
		expect(
			screen.getByRole("button", { name: "Buscar academia" }),
		).toBeInTheDocument()
	})

	test("usa o placeholder como aria-label de fallback no input cru quando não há aria-label explícito", () => {
		render(<SearchBar placeholder="Buscar academia" />)
		expect(
			screen.getByRole("searchbox", { name: "Buscar academia" }),
		).toBeInTheDocument()
	})

	test("reforça o anel de foco duplo no input cru", () => {
		render(<SearchBar placeholder="Buscar..." />)
		expect(screen.getByRole("searchbox")).toHaveClass("focus-ring-duplo")
	})
})
