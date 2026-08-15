import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
	let currentMe = { ...me }

	server.use(
		http.get(`${apiBaseUrl}/users/me`, () =>
			HttpResponse.json(currentMe, { status: 200 }),
		),
		http.patch(`${apiBaseUrl}/users/me`, async ({ request }) => {
			const body = (await request.json()) as { name?: string }
			currentMe = {
				...currentMe,
				name: body.name ?? currentMe.name,
			}
			return HttpResponse.json(
				{ name: String(currentMe.name ?? "") },
				{ status: 200 },
			)
		}),
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
		expect(screen.getByText("Admin")).toBeInTheDocument()
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

		expect(screen.queryByText("Admin")).not.toBeInTheDocument()
		expect(screen.getByText("MS")).toBeInTheDocument()
	})

	test("abre modal, valida nome, salva perfil e atualiza nome sem reload", async () => {
		const user = userEvent.setup()
		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-edit-button")).toBeInTheDocument()
		})

		await user.click(screen.getByTestId("profile-edit-button"))

		const nameInput = screen.getByTestId("edit-profile-name-input")
		expect(nameInput).toHaveValue("Admin User")
		expect(screen.getByTestId("edit-profile-password-link")).toHaveTextContent(
			"Alterar senha",
		)

		await user.clear(nameInput)
		await user.type(nameInput, "A")
		await user.click(screen.getByTestId("edit-profile-save"))

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Informe seu nome (mínimo 5 caracteres).",
		)

		await user.clear(nameInput)
		await user.type(nameInput, "Nome Atualizado")
		await user.click(screen.getByTestId("edit-profile-save"))

		await waitFor(() => {
			expect(
				screen.queryByTestId("edit-profile-name-input"),
			).not.toBeInTheDocument()
		})

		await waitFor(() => {
			expect(screen.getByTestId("profile-name")).toHaveTextContent(
				"Nome Atualizado",
			)
		})
	})

	test("exibe link para definir senha quando usuário não tem senha", async () => {
		const user = userEvent.setup()
		mockProfileApis({
			me: buildMeResponse({ hasPassword: false }),
		})

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-edit-button")).toBeInTheDocument()
		})

		await user.click(screen.getByTestId("profile-edit-button"))

		expect(screen.getByTestId("edit-profile-password-link")).toHaveTextContent(
			"Definir senha",
		)
	})
})

describe("ProfilePage — aba Atividade", () => {
	test("não busca atividade até a aba ser aberta", async () => {
		const user = userEvent.setup()
		let activityCalled = false
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () => {
				activityCalled = true
				return HttpResponse.json({ events: [] }, { status: 200 })
			}),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		expect(activityCalled).toBe(false)
		expect(
			screen.queryByTestId("activity-tab-skeleton"),
		).not.toBeInTheDocument()

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		await waitFor(() => {
			expect(activityCalled).toBe(true)
		})
	})

	test("exibe os eventos de atividade quando a aba é aberta", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () =>
				HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "CHECK_IN",
								description: "Check-in realizado",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
							{
								id: "activity-2",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: "2025-01-09T08:30:00.000Z",
							},
						],
					},
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByText("Check-in realizado")).toBeInTheDocument()
		expect(await screen.findByText("Login realizado")).toBeInTheDocument()
	})

	test("exibe estado vazio quando não há eventos", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () =>
				HttpResponse.json({ events: [] }, { status: 200 }),
			),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(
			await screen.findByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("exibe erro distinto do vazio quando a busca falha", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () =>
				HttpResponse.json({ message: "erro" }, { status: 500 }),
			),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Não foi possível carregar o histórico de atividade.",
		)
		expect(
			screen.queryByText("Sem dados de atividade disponíveis"),
		).not.toBeInTheDocument()
	})

	test("exibe skeleton durante o carregamento da atividade", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, async () => {
				await new Promise((resolve) => setTimeout(resolve, 50))
				return HttpResponse.json({ events: [] }, { status: 200 })
			}),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(screen.getByTestId("activity-tab-skeleton")).toBeInTheDocument()
	})
})
