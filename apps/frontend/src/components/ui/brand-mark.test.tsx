import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { BrandMark } from "./brand-mark"

describe("BrandMark", () => {
	test("exibe o wordmark VOLT", () => {
		render(<BrandMark />)
		expect(screen.getByText("VOLT")).toBeInTheDocument()
	})
	test("renderiza o ícone de raio (svg)", () => {
		const { container } = render(<BrandMark />)
		expect(container.querySelector("svg")).toBeInTheDocument()
	})
	test("oculta o wordmark quando wordmark=false", () => {
		render(<BrandMark wordmark={false} />)
		expect(screen.queryByText("VOLT")).not.toBeInTheDocument()
	})
	test("o ícone é decorativo e desenhado em pixel com bordas nítidas", () => {
		const { container } = render(<BrandMark />)
		const svg = container.querySelector("svg")
		expect(svg).toHaveAttribute("aria-hidden", "true")
		expect(svg).toHaveAttribute("shape-rendering", "crispEdges")
		expect(svg).toHaveAttribute("viewBox", "0 0 8 8")
	})
	test("o ícone usa apenas retângulos de coordenadas inteiras", () => {
		const { container } = render(<BrandMark />)
		const rects = Array.from(container.querySelectorAll("svg rect"))
		expect(rects.length).toBeGreaterThanOrEqual(5)
		for (const rect of rects) {
			for (const attribute of ["x", "y", "width", "height"]) {
				const value = Number(rect.getAttribute(attribute))
				expect(Number.isInteger(value), `${attribute}=${value}`).toBe(true)
			}
		}
	})
})
