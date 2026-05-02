import { screen, waitFor } from "@testing-library/react"
import { delay, HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { profileQueryKeys } from "@/features/profile/api"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import ProfilePage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("ProfilePage", () => {
	it("exibe skeleton durante loading e dados após resposta MSW", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me`, async () => {
				await delay(20)
				return HttpResponse.json(
					{ id: "u-1", name: "Alice", email: "alice@example.com" },
					{ status: 200 },
				)
			}),
			http.get(`${apiBaseUrl}/users/me/metrics`, async () => {
				await delay(20)
				return HttpResponse.json({ checkInsCount: 12 }, { status: 200 })
			}),
		)

		renderWithProviders(<ProfilePage />)

		expect(screen.getByTestId("profile-skeleton")).toBeInTheDocument()
		expect(screen.getByTestId("metrics-skeleton")).toBeInTheDocument()

		await waitFor(() => {
			expect(screen.getByTestId("profile-name")).toHaveTextContent("Alice")
		})
		expect(screen.getByTestId("profile-email")).toHaveTextContent(
			"alice@example.com",
		)
		expect(screen.getByTestId("metric-checkins")).toHaveTextContent("12")
	})

	it("exibe mensagem amigável quando /users/me retorna erro", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me`, () =>
				HttpResponse.json({ message: "fail" }, { status: 500 }),
			),
		)

		renderWithProviders(<ProfilePage />)

		expect(
			await screen.findByText(/não foi possível carregar seu perfil/i),
		).toBeInTheDocument()
		expect(screen.queryByText(/Error:/i)).not.toBeInTheDocument()
		expect(screen.getByTestId("profile-retry")).toBeInTheDocument()
	})

	it("expõe link para alterar senha (edição suportada pelo backend)", async () => {
		renderWithProviders(<ProfilePage />)
		const link = await screen.findByTestId("profile-change-password-link")
		expect(link).toHaveAttribute("href", "/perfil/senha")
	})

	it("exibe mensagem de erro específica para falha em métricas", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me/metrics`, () =>
				HttpResponse.json({}, { status: 500 }),
			),
		)
		renderWithProviders(<ProfilePage />)
		expect(
			await screen.findByText(/não foi possível carregar suas métricas/i),
		).toBeInTheDocument()
	})

	it("invalidação da query /users/me re-busca dados e atualiza a UI sem reload", async () => {
		let callCount = 0
		server.use(
			http.get(`${apiBaseUrl}/users/me`, () => {
				callCount += 1
				return HttpResponse.json(
					{
						id: "u-1",
						name: callCount === 1 ? "Alice" : "Alice Atualizada",
						email: "alice@example.com",
					},
					{ status: 200 },
				)
			}),
		)

		const { queryClient } = renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-name")).toHaveTextContent("Alice")
		})

		await queryClient.invalidateQueries({ queryKey: profileQueryKeys.me() })

		await waitFor(() => {
			expect(screen.getByTestId("profile-name")).toHaveTextContent(
				"Alice Atualizada",
			)
		})
		expect(callCount).toBeGreaterThanOrEqual(2)
	})
})
