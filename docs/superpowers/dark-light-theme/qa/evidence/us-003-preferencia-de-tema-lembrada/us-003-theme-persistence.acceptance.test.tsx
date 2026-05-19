import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeProvider, useTheme } from "next-themes"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

function AcceptanceThemeHarness() {
	const { theme, setTheme } = useTheme()

	return (
		<>
			<span data-testid="theme-value">{theme ?? "unknown"}</span>
			<button type="button" onClick={() => setTheme("dark")}>
				Ativar dark
			</button>
		</>
	)
}

describe("US-003 - persistência de tema com next-themes", () => {
	beforeEach(() => {
		window.localStorage.clear()
		document.documentElement.className = ""
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	test("deve usar light como tema padrão quando não existir preferência salva", async () => {
		render(
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
			>
				<AcceptanceThemeHarness />
			</ThemeProvider>,
		)

		await waitFor(() => {
			expect(screen.getByTestId("theme-value")).toHaveTextContent("light")
		})
		expect(window.localStorage.getItem("theme")).toBeNull()
	})

	test("deve persistir dark no localStorage ao alternar o tema", async () => {
		const setItemSpy = vi.spyOn(Storage.prototype, "setItem")

		render(
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
			>
				<AcceptanceThemeHarness />
			</ThemeProvider>,
		)

		await userEvent.click(
			await screen.findByRole("button", { name: "Ativar dark" }),
		)

		await waitFor(() => {
			expect(setItemSpy).toHaveBeenCalledWith("theme", "dark")
		})
		expect(window.localStorage.getItem("theme")).toBe("dark")
	})

	test("deve restaurar automaticamente o tema salvo ao montar novamente", async () => {
		window.localStorage.setItem("theme", "dark")

		render(
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
			>
				<AcceptanceThemeHarness />
			</ThemeProvider>,
		)

		await waitFor(() => {
			expect(screen.getByTestId("theme-value")).toHaveTextContent("dark")
		})
	})
})
