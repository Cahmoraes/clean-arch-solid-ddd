import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

const replace = vi.fn()
const searchParamsGet = vi.fn<(key: string) => string | null>(() => null)

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		replace,
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
	useSearchParams: () => ({
		get: searchParamsGet,
	}),
}))

import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { makeTestJwt, renderWithProviders } from "@/test/render"
import LoginPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("LoginPage", () => {
	beforeEach(() => {
		replace.mockClear()
		searchParamsGet.mockReset()
		searchParamsGet.mockImplementation(() => null)
	})

	it("submete credenciais válidas e redireciona para /academias", async () => {
		const token = makeTestJwt({ sub: "user-7", role: "MEMBER" })
		server.use(
			http.post(`${apiBaseUrl}/sessions`, () =>
				HttpResponse.json(
					{ token, refreshToken: "refresh-stub" },
					{ status: 200 },
				),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<LoginPage />)

		await user.type(screen.getByLabelText(/e-mail/i), "user@example.com")
		await user.type(screen.getByLabelText(/^senha$/i), "secret123")
		await user.click(screen.getByTestId("login-submit"))

		await waitFor(() => {
			expect(replace).toHaveBeenCalledWith("/academias")
		})
		expect(useAuthStore.getState().accessToken).toBe(token)
	})

	it("respeita query string `redirect` ao redirecionar", async () => {
		const token = makeTestJwt({ sub: "user-7" })
		searchParamsGet.mockImplementation((key) =>
			key === "redirect" ? "/perfil" : null,
		)
		server.use(
			http.post(`${apiBaseUrl}/sessions`, () =>
				HttpResponse.json({ token, refreshToken: "r" }, { status: 200 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<LoginPage />)

		await user.type(screen.getByLabelText(/e-mail/i), "user@example.com")
		await user.type(screen.getByLabelText(/^senha$/i), "secret123")
		await user.click(screen.getByTestId("login-submit"))

		await waitFor(() => expect(replace).toHaveBeenCalledWith("/perfil"))
	})

	it("exibe mensagem amigável (sem 401) ao receber credenciais inválidas", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions`, () =>
				HttpResponse.json({ message: "Invalid" }, { status: 401 }),
			),
		)
		const user = userEvent.setup()
		renderWithProviders(<LoginPage />)

		await user.type(screen.getByLabelText(/e-mail/i), "user@example.com")
		await user.type(screen.getByLabelText(/^senha$/i), "wrongpass1")
		await user.click(screen.getByTestId("login-submit"))

		const alert = await screen.findByTestId("login-submit-error")
		expect(alert.textContent).toMatch(/incorret/i)
		expect(alert.textContent).not.toMatch(/401/)
		expect(replace).not.toHaveBeenCalled()
	})

	it("bloqueia submissão quando email é inválido", async () => {
		const user = userEvent.setup()
		renderWithProviders(<LoginPage />)

		await user.type(screen.getByLabelText(/e-mail/i), "not-an-email")
		await user.type(screen.getByLabelText(/^senha$/i), "secret123")
		await user.click(screen.getByTestId("login-submit"))

		expect(await screen.findByText(/e-mail válido/i)).toBeInTheDocument()
		expect(replace).not.toHaveBeenCalled()
	})
})
