import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Eyebrow } from "./eyebrow"

describe("Eyebrow", () => {
	test("rótulo em ciano, display e maiúsculo", () => {
		render(<Eyebrow>Admin</Eyebrow>)
		expect(screen.getByText("Admin")).toHaveClass(
			"font-display",
			"uppercase",
			"text-accent",
		)
	})

	test("Eyebrow usa font-display em 15px, nunca abaixo disso", () => {
		render(<Eyebrow>Painel</Eyebrow>)
		const el = screen.getByText("Painel")
		expect(el).toHaveClass("font-display")
		expect(el).toHaveClass("text-[15px]")
		expect(el).not.toHaveClass("font-mono")
	})
})
