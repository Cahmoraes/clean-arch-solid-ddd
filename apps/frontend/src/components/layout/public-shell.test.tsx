import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { PublicShell } from "./public-shell"

vi.mock("next-themes", () => ({
	useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}))

describe("PublicShell", () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.removeAttribute("data-motion-paused")
	})

	test("renderiza header com CTAs de login e cadastro", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		const nav = screen.getByRole("navigation", {
			name: /navegação principal/i,
		})
		expect(nav).toBeInTheDocument()
		const clima = screen.getByRole("link", { name: /clima/i })
		const entrar = screen.getByRole("link", { name: /entrar/i })
		const cadastrar = screen.getByRole("link", { name: /criar conta/i })
		expect(clima).toHaveAttribute("href", "/clima")
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

describe("PublicShell — acessibilidade", () => {
	test("exibe skip-link para o conteúdo principal", () => {
		const { container } = render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		const skipLink = screen.getByRole("link", {
			name: "Pular para o conteúdo principal",
		})
		expect(skipLink).toHaveAttribute("href", "#main-content")
		expect(container.querySelector("#main-content")).toBeInTheDocument()
	})
})

describe("PublicShell — controle de animações", () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.removeAttribute("data-motion-paused")
	})

	test("exibe o seletor de tema no header público", () => {
		render(
			<PublicShell>
				<div />
			</PublicShell>,
		)
		expect(screen.getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument()
	})
})

describe("PublicShell — ação primária", () => {
	test("o CTA Criar conta usa o primary (magenta) e não o acento", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		const cta = screen.getByRole("link", { name: /criar conta/i })
		expect(cta).toHaveClass("bg-primary", "text-primary-foreground")
		expect(cta).not.toHaveClass("bg-accent")
	})
})
