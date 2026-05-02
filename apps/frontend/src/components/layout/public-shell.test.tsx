import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PublicShell } from "./public-shell"

describe("PublicShell", () => {
	it("renderiza header com CTAs de login e cadastro", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		const nav = screen.getByRole("navigation", {
			name: /ações de autenticação/i,
		})
		expect(nav).toBeInTheDocument()
		const entrar = screen.getByRole("link", { name: /entrar/i })
		const cadastrar = screen.getByRole("link", { name: /criar conta/i })
		expect(entrar).toHaveAttribute("href", "/login")
		expect(cadastrar).toHaveAttribute("href", "/cadastro")
	})

	it("renderiza conteúdo no slot principal", () => {
		render(
			<PublicShell>
				<p>conteúdo de demo</p>
			</PublicShell>,
		)
		expect(screen.getByText("conteúdo de demo")).toBeInTheDocument()
	})
})
