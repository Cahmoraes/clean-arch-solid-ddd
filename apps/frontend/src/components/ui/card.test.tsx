import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { CardTitle } from "./card"

describe("CardTitle", () => {
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
