import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { GymCnpjField } from "./gym-cnpj-field"

describe("GymCnpjField", () => {
	test("indica o campo obrigatório via aria-required e texto para leitor de tela", () => {
		renderWithProviders(<GymCnpjField id="cnpj" value="" onAccept={vi.fn()} />)
		expect(screen.getByLabelText(/cnpj/i)).toHaveAttribute(
			"aria-required",
			"true",
		)
		expect(screen.getByText("(obrigatório)")).toBeInTheDocument()
		expect(screen.queryByText("*")).not.toBeInTheDocument()
	})
})
