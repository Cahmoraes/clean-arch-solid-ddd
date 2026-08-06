import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const setTheme = vi.fn()
let currentTheme = "dark"

vi.mock("next-themes", () => ({
	useTheme: () => ({ theme: currentTheme, setTheme }),
}))

import { ThemeToggle } from "./theme-toggle"

describe("ThemeToggle", () => {
	beforeEach(() => {
		setTheme.mockClear()
		currentTheme = "dark"
	})

	test("alterna para light quando o tema atual é dark", () => {
		render(<ThemeToggle />)
		fireEvent.click(screen.getByRole("button", { name: /modo/i }))
		expect(setTheme).toHaveBeenCalledWith("light")
	})

	test("alterna para dark quando o tema atual é light", () => {
		currentTheme = "light"
		render(<ThemeToggle />)
		fireEvent.click(screen.getByRole("button", { name: /modo/i }))
		expect(setTheme).toHaveBeenCalledWith("dark")
	})

	test("não exibe texto visível de Claro/Escuro", () => {
		render(<ThemeToggle />)
		expect(screen.queryByText("Claro")).toBeNull()
		expect(screen.queryByText("Escuro")).toBeNull()
	})

	test("mantém o mesmo tamanho compacto em qualquer largura, sem breakpoint especial", () => {
		render(<ThemeToggle />)
		const button = screen.getByRole("button", { name: /modo/i })
		expect(button.className).toContain("w-16")
		expect(button.className).not.toContain("max-[860px]")
	})

	test("compact: renderiza botão redondo (~36px) sem trilho/pill deslizante", () => {
		render(<ThemeToggle compact />)
		const button = screen.getByRole("button", { name: /modo/i })
		expect(button.className).toContain("rounded-full")
		expect(button.className).toContain("h-9")
		expect(button.className).toContain("w-9")
		expect(button.className).not.toContain("w-16")
	})

	test("compact: alterna tema no clique", () => {
		render(<ThemeToggle compact />)
		fireEvent.click(screen.getByRole("button", { name: /modo/i }))
		expect(setTheme).toHaveBeenCalledWith("light")
	})

	test("compact: aria-label reflete o estado, igual à variante completa", () => {
		currentTheme = "light"
		render(<ThemeToggle compact />)
		expect(
			screen.getByRole("button", { name: "Ativar modo escuro" }),
		).toBeInTheDocument()
	})
})
