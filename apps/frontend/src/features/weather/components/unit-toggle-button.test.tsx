import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { UnitToggleButton } from "./unit-toggle-button"

describe("UnitToggleButton", () => {
	test("deve mostrar °F e aria-pressed falso no sistema métrico, e chamar onToggle ao clicar", async () => {
		const onToggle = vi.fn()
		render(<UnitToggleButton units="metric" onToggle={onToggle} />)

		const button = screen.getByRole("button", { name: "Mudar para °F e mph" })
		expect(button).toHaveTextContent("°F")
		expect(button).toHaveAttribute("aria-pressed", "false")
		await userEvent.click(button)
		expect(onToggle).toHaveBeenCalledTimes(1)
	})

	test("deve mostrar °C e aria-pressed verdadeiro no sistema imperial", () => {
		render(<UnitToggleButton units="imperial" onToggle={vi.fn()} />)

		const button = screen.getByRole("button", { name: "Mudar para °C e km/h" })
		expect(button).toHaveTextContent("°C")
		expect(button).toHaveAttribute("aria-pressed", "true")
	})
})
