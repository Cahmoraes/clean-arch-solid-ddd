import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const setTheme = vi.fn()
let currentResolvedTheme: string | undefined = "dark"

vi.mock("next-themes", () => ({
	useTheme: () => ({ resolvedTheme: currentResolvedTheme, setTheme }),
}))

import { ThemeToggle } from "./theme-toggle"

describe("ThemeToggle", () => {
	beforeEach(() => {
		setTheme.mockClear()
		currentResolvedTheme = "dark"
	})

	test("versão completa exibe um radiogroup com os 3 temas e marca o atual", () => {
		render(<ThemeToggle />)
		const group = screen.getByRole("radiogroup", { name: "Tema" })
		const radios = within(group).getAllByRole("radio")
		expect(radios).toHaveLength(3)
		expect(screen.getByRole("radio", { name: "Tema Neon" })).toHaveAttribute(
			"aria-checked",
			"true",
		)
	})

	test("clicar em Pôr do sol chama setTheme com sunset", () => {
		render(<ThemeToggle />)
		fireEvent.click(screen.getByRole("radio", { name: "Tema Pôr do sol" }))
		expect(setTheme).toHaveBeenCalledWith("sunset")
	})

	test("clicar em Neblina chama setTheme com light", () => {
		render(<ThemeToggle />)
		fireEvent.click(screen.getByRole("radio", { name: "Tema Neblina" }))
		expect(setTheme).toHaveBeenCalledWith("light")
	})

	test("compact percorre o ciclo Neon -> Pôr do sol -> Neblina -> Neon", () => {
		const { rerender } = render(<ThemeToggle compact />)
		expect(
			screen.getByRole("button", { name: "Ativar tema Pôr do sol" }),
		).toBeInTheDocument()
		fireEvent.click(
			screen.getByRole("button", { name: "Ativar tema Pôr do sol" }),
		)
		expect(setTheme).toHaveBeenCalledWith("sunset")

		currentResolvedTheme = "sunset"
		rerender(<ThemeToggle compact />)
		expect(
			screen.getByRole("button", { name: "Ativar tema Neblina" }),
		).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Ativar tema Neblina" }))
		expect(setTheme).toHaveBeenCalledWith("light")

		currentResolvedTheme = "light"
		rerender(<ThemeToggle compact />)
		expect(
			screen.getByRole("button", { name: "Ativar tema Neon" }),
		).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Ativar tema Neon" }))
		expect(setTheme).toHaveBeenCalledWith("dark")
	})

	test("valor de tema desconhecido é tratado como Neon", () => {
		currentResolvedTheme = undefined
		render(<ThemeToggle />)
		expect(screen.getByRole("radio", { name: "Tema Neon" })).toHaveAttribute(
			"aria-checked",
			"true",
		)
	})

	test("sem rounded-full no compact nem no completo", () => {
		const { container, rerender } = render(<ThemeToggle compact />)
		expect(container.querySelector(".rounded-full")).toBeNull()
		rerender(<ThemeToggle />)
		expect(container.querySelector(".rounded-full")).toBeNull()
	})
})
