import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import RootLayout from "../../../../../../apps/frontend/src/app/layout"
import { ThemeToggleFAB } from "../../../../../../apps/frontend/src/components/ui/theme-toggle-fab"

const mockSetTheme = vi.fn()
const mockThemeProvider = vi.fn(({ children }: { children: ReactNode }) => <>{children}</>)

vi.mock("next-themes", async () => {
	const actual = await vi.importActual<typeof import("next-themes")>("next-themes")

	return {
		...actual,
		ThemeProvider: mockThemeProvider,
		useTheme: vi.fn(),
	}
})

async function importUseTheme() {
	const { useTheme } = await import("next-themes")
	return useTheme as ReturnType<typeof vi.fn>
}

describe("US-003 - configuração e acionamento do tema", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test("deve configurar o ThemeProvider com defaultTheme light e storageKey padrão theme", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

		render(<RootLayout>conteúdo</RootLayout>)

		expect(mockThemeProvider).toHaveBeenCalled()
		const props = mockThemeProvider.mock.calls[0][0]
		expect(props.attribute).toBe("class")
		expect(props.defaultTheme).toBe("light")
		expect(props.storageKey ?? "theme").toBe("theme")
	})

	test("deve chamar setTheme('dark') ao clicar no toggle quando o tema atual é light", async () => {
		const useTheme = await importUseTheme()
		useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

		render(<ThemeToggleFAB />)
		await userEvent.click(screen.getByRole("button", { name: "Ativar tema escuro" }))

		expect(mockSetTheme).toHaveBeenCalledWith("dark")
	})
})
