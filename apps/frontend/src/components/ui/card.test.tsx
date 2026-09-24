import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Card, CardTitle } from "./card"

describe("CardTitle", () => {
	test("usa font-display 26px", () => {
		render(
			<Card>
				<CardTitle>Check-ins da semana</CardTitle>
			</Card>,
		)
		expect(screen.getByText("Check-ins da semana")).toHaveClass("font-display")
		expect(screen.getByText("Check-ins da semana")).toHaveClass("text-[26px]")
	})

	test("renderiza como heading de nível 3 por padrão", () => {
		render(<CardTitle>Texto do card</CardTitle>)
		expect(
			screen.getByRole("heading", { level: 3, name: "Texto do card" }),
		).toBeInTheDocument()
	})

	test("renderiza como heading de nível 2 quando as='h2'", () => {
		render(<CardTitle as="h2">Texto do card</CardTitle>)
		expect(
			screen.getByRole("heading", { level: 2, name: "Texto do card" }),
		).toBeInTheDocument()
	})
})
