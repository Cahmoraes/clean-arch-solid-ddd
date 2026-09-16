import { render, screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { StatusBadge, statusStripeBorderClass } from "./status-badge"

describe("StatusBadge", () => {
	test("FR-003: renderiza o ícone semântico de status junto do texto", () => {
		render(<StatusBadge tone="success">Ativo</StatusBadge>)
		const badge = screen.getByText("Ativo").closest("span")
		expect(badge).not.toBeNull()
		expect(within(badge as HTMLElement).getByText("Ativo")).toBeInTheDocument()
		expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
	})

	test("FR-004: aceita vocabulário de academia com o mesmo par tone+children", () => {
		render(<StatusBadge tone="danger">Desativada</StatusBadge>)
		const badge = screen.getByText("Desativada").closest("span")
		expect(badge).not.toBeNull()
		expect(
			within(badge as HTMLElement).getByText("Desativada"),
		).toBeInTheDocument()
		expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
	})

	test("FR-001: variant stripe renderiza só texto acessível, sem pill visual", () => {
		render(
			<StatusBadge tone="success" variant="stripe">
				Ativo
			</StatusBadge>,
		)
		const label = screen.getByText("Ativo")
		expect(label).toHaveClass("sr-only")
		expect(label.closest("span")?.querySelector("svg")).toBeNull()
	})

	test("FR-001: statusStripeBorderClass mapeia cada tom para a cor de borda correta", () => {
		expect(statusStripeBorderClass("success")).toBe("border-l-success")
		expect(statusStripeBorderClass("warning")).toBe("border-l-warning")
		expect(statusStripeBorderClass("danger")).toBe("border-l-destructive")
		expect(statusStripeBorderClass("neutral")).toBe("border-l-border-strong")
	})
})
