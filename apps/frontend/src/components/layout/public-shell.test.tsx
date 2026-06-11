import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { PublicShell } from "./public-shell"

describe("PublicShell", () => {
	test("renderiza header com CTAs de login e cadastro", () => {
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

	test("renderiza conteúdo no slot principal", () => {
		render(
			<PublicShell>
				<p>conteúdo de demo</p>
			</PublicShell>,
		)
		expect(screen.getByText("conteúdo de demo")).toBeInTheDocument()
	})

	test("header do PublicShell usa borda inferior VOLT (sem bloco primary)", () => {
		render(<PublicShell>conteúdo</PublicShell>)
		const header = screen.getByRole("banner")
		expect(header).toHaveClass("border-b", "border-border")
		expect(header).not.toHaveClass("bg-primary")
	})
})

describe("PublicShell — marca VOLT", () => {
	test("exibe o wordmark VOLT no header", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		const marks = screen.getAllByText("VOLT")
		expect(marks.length).toBeGreaterThanOrEqual(1)
	})

	test("não exibe mais a marca antiga GymPass", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		expect(screen.queryByText(/GymPass/i)).not.toBeInTheDocument()
	})
})
