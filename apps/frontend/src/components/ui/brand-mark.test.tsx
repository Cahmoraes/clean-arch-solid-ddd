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
})
