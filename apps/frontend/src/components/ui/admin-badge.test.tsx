import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AdminBadge } from "./admin-badge"

describe("AdminBadge", () => {
	it("renderiza o texto ADMIN", () => {
		render(<AdminBadge />)
		expect(screen.getByText("ADMIN")).toBeInTheDocument()
	})

	it("renderiza o ícone de escudo (svg)", () => {
		const { container } = render(<AdminBadge />)
		expect(container.querySelector("svg")).toBeInTheDocument()
	})

	it("aplica className adicional quando fornecido", () => {
		render(<AdminBadge className="mt-2" />)
		const badge = screen.getByText("ADMIN").closest("span")
		expect(badge).toHaveClass("mt-2")
	})
})
