import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { ThemeToggleFAB } from "./theme-toggle-fab"

const mockSetTheme = vi.fn()

vi.mock("next-themes", () => ({
	useTheme: vi.fn(),
}))

async function importUseTheme() {
	const { useTheme } = await import("next-themes")
	return useTheme as ReturnType<typeof vi.fn>
}

describe("ThemeToggleFAB", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test("não renderiza nada antes do mount para evitar flash visual", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

		expect(renderToStaticMarkup(<ThemeToggleFAB />)).toBe("")
	})

	test("renderiza o botão após o mount", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

		render(<ThemeToggleFAB />)
		expect(screen.getByRole("button")).toBeInTheDocument()
	})

	test("exibe ícone 🌙 quando tema é light", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

		render(<ThemeToggleFAB />)
		expect(screen.getByRole("button")).toHaveTextContent("🌙")
	})

	test("exibe ícone ☀️ quando tema é dark", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "dark", setTheme: mockSetTheme })

		render(<ThemeToggleFAB />)
		expect(screen.getByRole("button")).toHaveTextContent("☀️")
	})

	test("chama setTheme('dark') ao clicar em modo light", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

		render(<ThemeToggleFAB />)
		await userEvent.click(screen.getByRole("button"))
		expect(mockSetTheme).toHaveBeenCalledWith("dark")
	})

	test("chama setTheme('light') ao clicar em modo dark", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "dark", setTheme: mockSetTheme })

		render(<ThemeToggleFAB />)
		await userEvent.click(screen.getByRole("button"))
		expect(mockSetTheme).toHaveBeenCalledWith("light")
	})

	test("tem aria-label 'Ativar tema escuro' no modo light", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

		render(<ThemeToggleFAB />)
		expect(screen.getByRole("button")).toHaveAttribute(
			"aria-label",
			"Ativar tema escuro",
		)
	})

	test("tem aria-label 'Ativar tema claro' no modo dark", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "dark", setTheme: mockSetTheme })

		render(<ThemeToggleFAB />)
		expect(screen.getByRole("button")).toHaveAttribute(
			"aria-label",
			"Ativar tema claro",
		)
	})
})
