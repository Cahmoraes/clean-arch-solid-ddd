import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import ProfilePage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function mockProfileApis() {
	server.use(
		http.get(`${apiBaseUrl}/users/me`, () =>
			HttpResponse.json(
				{
					id: "user-1",
					name: "Admin User",
					email: "admin@email.com",
					hasPassword: true,
				},
				{ status: 200 },
			),
		),
		http.get(`${apiBaseUrl}/users/me/metrics`, () =>
			HttpResponse.json({ checkInsCount: 5 }, { status: 200 }),
		),
	)
}

describe("ProfilePage — AdminBadge", () => {
	beforeEach(() => {
		mockProfileApis()
	})

	it("exibe o badge ADMIN quando o usuário é administrador", async () => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "user-1", role: "ADMIN" },
		})

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByText("ADMIN")).toBeInTheDocument()
		})
	})

	it("não exibe o badge ADMIN quando o usuário é membro", async () => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "user-1", role: "MEMBER" },
		})

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-data")).toBeInTheDocument()
		})
		expect(screen.queryByText("ADMIN")).not.toBeInTheDocument()
	})
})
