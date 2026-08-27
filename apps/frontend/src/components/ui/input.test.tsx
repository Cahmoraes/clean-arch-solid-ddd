import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Input } from "./input"

describe("Input", () => {
	test("deve aplicar o anel de foco duplo (focus-ring-duplo) e a borda com contraste (border-subtle)", () => {
		render(<Input placeholder="exemplo" />)
		const input = screen.getByRole("textbox")
		expect(input).toHaveClass("focus-ring-duplo")
		expect(input).toHaveClass("border-subtle")
	})
})
