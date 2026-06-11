import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import LandingPage from "./page"

describe("Landing pública (RSC)", () => {
	it("renderiza CTAs de cadastro e login", () => {
		render(<LandingPage />)
		const signup = screen.getByTestId("cta-signup")
		const login = screen.getByTestId("cta-login")
		expect(signup).toHaveAttribute("href", "/cadastro")
		expect(login).toHaveAttribute("href", "/login")
	})

	it("renderiza título principal e descrição", () => {
		render(<LandingPage />)
		expect(
			screen.getByRole("heading", { level: 1, name: /acesso a academias/i }),
		).toBeInTheDocument()
		expect(screen.getByText(/encontre academias próximas/i)).toBeInTheDocument()
	})
})
