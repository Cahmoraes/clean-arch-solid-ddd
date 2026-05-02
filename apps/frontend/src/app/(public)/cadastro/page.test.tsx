import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import SignupPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("SignupPage", () => {
	it("exibe instrução de ativação após cadastro bem-sucedido", async () => {
		server.use(
			http.post(`${apiBaseUrl}/users`, async ({ request }) => {
				const body = (await request.json()) as { email: string }
				return HttpResponse.json(
					{ message: "User created", email: body.email },
					{ status: 201 },
				)
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SignupPage />)

		await user.type(screen.getByLabelText(/nome/i), "John Doe")
		await user.type(screen.getByLabelText(/e-mail/i), "john@example.com")
		await user.type(screen.getByLabelText(/^senha$/i), "secret123")
		await user.click(screen.getByTestId("signup-submit"))

		const success = await screen.findByTestId("signup-success")
		expect(success.textContent).toMatch(/ativ/i)
		expect(success.textContent).toContain("john@example.com")
	})

	it("exibe mensagem amigável quando email já cadastrado (409)", async () => {
		server.use(
			http.post(`${apiBaseUrl}/users`, () =>
				HttpResponse.json({ message: "exists" }, { status: 409 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<SignupPage />)

		await user.type(screen.getByLabelText(/nome/i), "John Doe")
		await user.type(screen.getByLabelText(/e-mail/i), "john@example.com")
		await user.type(screen.getByLabelText(/^senha$/i), "secret123")
		await user.click(screen.getByTestId("signup-submit"))

		const alert = await screen.findByTestId("signup-submit-error")
		expect(alert.textContent).toMatch(/já está cadastrado/i)
	})
})
