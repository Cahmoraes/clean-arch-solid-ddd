import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { Toaster } from "@/components/ui/toaster"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

vi.mock("@react-oauth/google", () => ({
	GoogleLogin: ({
		onSuccess,
	}: {
		onSuccess: (resp: { credential?: string }) => void
	}) => (
		<button
			type="button"
			data-testid="google-login-mock"
			onClick={() => onSuccess({ credential: "fake-google-token" })}
		>
			Google
		</button>
	),
	GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
}))

import ChangePasswordPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("ChangePasswordPage", () => {
	test("submete nova senha quando válida", async () => {
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

		await user.type(await screen.findByLabelText(/senha atual/i), "oldpass1")
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

	test("bloqueia submissão quando confirmação diverge da nova senha", async () => {
		const user = userEvent.setup()
		renderWithProviders(<ChangePasswordPage />)

		await user.type(await screen.findByLabelText(/senha atual/i), "oldpass1")
		await user.type(screen.getByLabelText(/^nova senha$/i), "newpass1")
		await user.type(
			screen.getByLabelText(/confirmar nova senha/i),
			"different1",
		)
		await user.click(screen.getByTestId("change-password-submit"))

		expect(await screen.findByText(/corresponde/i)).toBeInTheDocument()
	})

	test("exibe erro amigável em 401", async () => {
		server.use(
			http.patch(`${apiBaseUrl}/users/me/change-password`, () =>
				HttpResponse.json({ message: "no" }, { status: 401 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<ChangePasswordPage />)

		await user.type(await screen.findByLabelText(/senha atual/i), "oldpass1")
		await user.type(screen.getByLabelText(/^nova senha$/i), "newpass1")
		await user.type(screen.getByLabelText(/confirmar nova senha/i), "newpass1")
		await user.click(screen.getByTestId("change-password-submit"))

		const alert = await screen.findByTestId("change-password-submit-error")
		expect(alert.textContent).toMatch(/atual incorret/i)
	})

	test("renderiza o fluxo de definir senha sem campo de senha atual", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me`, () =>
				HttpResponse.json(
					{
						id: "u-1",
						name: "Alice",
						email: "alice@example.com",
						role: "MEMBER",
						hasPassword: false,
						authMethods: ["google"],
					},
					{ status: 200 },
				),
			),
			http.post(`${apiBaseUrl}/users/me/password/reauth`, () =>
				HttpResponse.json(
					{ reauthGrant: "grant-123", expiresInSeconds: 300 },
					{ status: 200 },
				),
			),
			http.post(`${apiBaseUrl}/users/me/password`, async ({ request }) => {
				const body = (await request.json()) as {
					provider: string
					reauthGrant: string
					newRawPassword: string
				}
				expect(body).toEqual({
					provider: "google",
					reauthGrant: "grant-123",
					newRawPassword: "SenhaNova123!",
				})
				return new HttpResponse(null, { status: 204 })
			}),
		)

		const user = userEvent.setup()
		renderWithProviders(
			<>
				<ChangePasswordPage />
				<Toaster />
			</>,
		)

		const newPasswordInput = await screen.findByLabelText(/^nova senha$/i)
		expect(screen.queryByLabelText(/senha atual/i)).not.toBeInTheDocument()
		await user.type(newPasswordInput, "SenhaNova123!")
		await user.type(
			screen.getByLabelText(/confirmar nova senha/i),
			"SenhaNova123!",
		)
		await user.click(screen.getByTestId("google-login-mock"))
		await user.click(screen.getByTestId("change-password-submit"))

		expect(
			await screen.findByText(/reautenticação confirmada/i),
		).toBeInTheDocument()
	})
})
