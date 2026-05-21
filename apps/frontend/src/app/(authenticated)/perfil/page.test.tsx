import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, test } from "vitest"

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import ProfilePage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function buildMeResponse(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-1",
		name: "Admin User",
		email: "admin@email.com",
		role: "ADMIN",
		status: "activated",
		createdAt: "2024-01-15T12:00:00.000Z",
		hasPassword: true,
		...overrides,
	}
}

function formatCreatedAt(iso: string): string {
	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(iso))
}

function mockProfileApis({
	me = buildMeResponse(),
	metrics = { checkInsCount: 5 },
}: {
	me?: Record<string, unknown>
	metrics?: { checkInsCount: number }
} = {}) {
	server.use(
		http.get(`${apiBaseUrl}/users/me`, () =>
			HttpResponse.json(me, { status: 200 }),
		),
		http.get(`${apiBaseUrl}/users/me/metrics`, () =>
			HttpResponse.json(metrics, { status: 200 }),
		),
	)
}

describe("ProfilePage", () => {
	beforeEach(() => {
		mockProfileApis()
	})

	test("exibe cartão compacto com avatar, dados, badges e botão de edição", async () => {
		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		expect(screen.getByTestId("profile-name")).toHaveTextContent("Admin User")
		expect(screen.getByTestId("profile-email")).toHaveTextContent(
			"admin@email.com",
		)
		expect(screen.getByTestId("profile-id")).toHaveTextContent("user-1")
		expect(screen.getByTestId("profile-created-at")).toHaveTextContent(
			formatCreatedAt("2024-01-15T12:00:00.000Z"),
		)
		expect(screen.getByTestId("metric-checkins")).toHaveTextContent("5")
		expect(screen.getByText("ADMIN")).toBeInTheDocument()
		expect(screen.getByText("Ativo")).toBeInTheDocument()
		expect(screen.getByTestId("profile-edit-button")).toHaveTextContent(
			"Editar perfil",
		)
		expect(screen.getByText("AU")).toBeInTheDocument()
	})

	test("exibe status suspenso para usuário inativo", async () => {
		mockProfileApis({
			me: buildMeResponse({
				role: "MEMBER",
				status: "suspended",
				name: "Maria Souza",
			}),
		})

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByText("Suspenso")).toBeInTheDocument()
		})

		expect(screen.queryByText("ADMIN")).not.toBeInTheDocument()
		expect(screen.getByText("MS")).toBeInTheDocument()
	})
})
