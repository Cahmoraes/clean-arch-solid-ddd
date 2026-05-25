import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { AdminBadge } from "./admin-badge"

describe("AdminBadge", () => {
	test("renderiza o texto ADMIN", () => {
		render(<AdminBadge />)
		expect(screen.getByText("ADMIN")).toBeInTheDocument()
	})

	test("renderiza o ícone de escudo (svg)", () => {
		const { container } = render(<AdminBadge />)
		expect(container.querySelector("svg")).toBeInTheDocument()
	})

	test("aplica className adicional quando fornecido", () => {
		render(<AdminBadge className="mt-2" />)
		const badge = screen.getByText("ADMIN").closest("span")
		expect(badge).toHaveClass("mt-2")
	})
})
