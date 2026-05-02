import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { PublicProfileView } from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("PublicProfileView", () => {
	it("exibe nome e dados públicos do usuário consultado", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId`, ({ params }) =>
				HttpResponse.json(
					{
						id: params.userId,
						name: "Carla Silva",
						email: "carla@example.com",
						role: "MEMBER",
					},
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<PublicProfileView userId="user-99" />)

		await waitFor(() => {
			expect(screen.getByTestId("public-profile-name")).toHaveTextContent(
				"Carla Silva",
			)
		})
		expect(screen.getByTestId("public-profile-email")).toHaveTextContent(
			"carla@example.com",
		)
		expect(screen.getByTestId("public-profile-id")).toHaveTextContent("user-99")
		expect(screen.getByTestId("public-profile-role")).toHaveTextContent(
			"Membro",
		)
	})

	it("exibe estado de não encontrado em 404", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId`, () =>
				HttpResponse.json({ message: "not found" }, { status: 404 }),
			),
		)
		renderWithProviders(<PublicProfileView userId="user-missing" />)
		expect(
			await screen.findByText(/usuário não encontrado/i),
		).toBeInTheDocument()
	})

	it("exibe erro amigável em 500 com botão de retentar", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId`, () =>
				HttpResponse.json({}, { status: 500 }),
			),
		)
		renderWithProviders(<PublicProfileView userId="user-x" />)
		expect(
			await screen.findByText(/não foi possível carregar este perfil/i),
		).toBeInTheDocument()
		expect(screen.getByTestId("public-profile-retry")).toBeInTheDocument()
	})
})
