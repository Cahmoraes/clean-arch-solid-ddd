import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import ChangePasswordPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("ChangePasswordPage", () => {
	it("submete nova senha quando válida", async () => {
		let received: {
			currentRawPassword: string
			newRawPassword: string
		} | null = null
		server.use(
			http.patch(
				`${apiBaseUrl}/users/me/change-password`,
				async ({ request }) => {
					received = (await request.json()) as {
						currentRawPassword: string
						newRawPassword: string
					}
					return new HttpResponse(null, { status: 204 })
				},
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<ChangePasswordPage />)

		await user.type(screen.getByLabelText(/senha atual/i), "oldpass1")
		await user.type(screen.getByLabelText(/^nova senha$/i), "newpass1")
		await user.type(screen.getByLabelText(/confirmar nova senha/i), "newpass1")
		await user.click(screen.getByTestId("change-password-submit"))

		await waitFor(() => {
			expect(received).toEqual({
				currentRawPassword: "oldpass1",
				newRawPassword: "newpass1",
			})
		})
	})

	it("bloqueia submissão quando confirmação diverge da nova senha", async () => {
		const user = userEvent.setup()
		renderWithProviders(<ChangePasswordPage />)

		await user.type(screen.getByLabelText(/senha atual/i), "oldpass1")
		await user.type(screen.getByLabelText(/^nova senha$/i), "newpass1")
		await user.type(
			screen.getByLabelText(/confirmar nova senha/i),
			"different1",
		)
		await user.click(screen.getByTestId("change-password-submit"))

		expect(await screen.findByText(/corresponde/i)).toBeInTheDocument()
	})

	it("exibe erro amigável em 401", async () => {
		server.use(
			http.patch(`${apiBaseUrl}/users/me/change-password`, () =>
				HttpResponse.json({ message: "no" }, { status: 401 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<ChangePasswordPage />)

		await user.type(screen.getByLabelText(/senha atual/i), "oldpass1")
		await user.type(screen.getByLabelText(/^nova senha$/i), "newpass1")
		await user.type(screen.getByLabelText(/confirmar nova senha/i), "newpass1")
		await user.click(screen.getByTestId("change-password-submit"))

		const alert = await screen.findByTestId("change-password-submit-error")
		expect(alert.textContent).toMatch(/atual incorret/i)
	})
})
