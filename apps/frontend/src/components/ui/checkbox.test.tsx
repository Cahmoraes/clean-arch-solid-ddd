import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Checkbox } from "./checkbox"

describe("Checkbox", () => {
	test("aplica anel de foco duplo e borda com contraste no checkbox", () => {
		render(<Checkbox aria-label="Aceitar termos" />)
		const checkbox = screen.getByRole("checkbox")
		expect(checkbox).toHaveClass("focus-ring-duplo")
		expect(checkbox).toHaveClass("border-subtle")
	})

	test("oculta o ícone de check decorativo de leitores de tela quando marcado", () => {
		const { container } = render(
			<Checkbox aria-label="Aceitar termos" defaultChecked />,
		)
		const icon = container.querySelector("svg")
		expect(icon).toHaveAttribute("aria-hidden", "true")
	})

	test("garante alvo de toque mínimo de 24x24px ao redor do checkbox", () => {
		render(<Checkbox aria-label="Aceitar termos" />)
		const wrapper = screen.getByRole("checkbox").parentElement
		expect(wrapper).toHaveClass("min-h-6")
		expect(wrapper).toHaveClass("min-w-6")
	})
})
