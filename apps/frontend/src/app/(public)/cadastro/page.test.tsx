import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const replace = vi.fn()

vi.mock("@react-oauth/google", () => ({
	GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
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
}))

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		replace,
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
}))

import { server } from "@/test/msw/server"
import { makeTestJwt, renderWithProviders } from "@/test/render"
import SignupPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("SignupPage", () => {
	beforeEach(() => {
		replace.mockClear()
	})

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

	it("redireciona para /academias após cadastro Google bem-sucedido", async () => {
		const token = makeTestJwt({ sub: "google-signup-user", role: "MEMBER" })
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json(
					{ token, refreshToken: "google-refresh" },
					{ status: 200 },
				),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<SignupPage />)

		await user.click(screen.getByTestId("google-login-mock"))

		await waitFor(() => {
			expect(replace).toHaveBeenCalledWith("/academias")
		})
	})
})
