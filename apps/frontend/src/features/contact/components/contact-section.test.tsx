import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { renderWithProviders } from "@/test/render"
import { CONTACT_EMAIL } from "../constants"
import { ContactSection } from "./contact-section"

describe("ContactSection", () => {
	test("exibe título, formulário e os dois cards de contato", () => {
		renderWithProviders(<ContactSection />)
		expect(
			screen.getByRole("heading", { name: /fale conosco/i }),
		).toBeInTheDocument()
		expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument()
		expect(screen.getByText(CONTACT_EMAIL)).toBeInTheDocument()
		expect(screen.getByText("Em até 24h")).toBeInTheDocument()
	})
})
