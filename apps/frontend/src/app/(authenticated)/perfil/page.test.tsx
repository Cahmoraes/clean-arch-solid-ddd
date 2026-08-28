import { QueryClient } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { useRouter, useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import ProfilePage from "./page"

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}))

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
let currentSearchParams = new URLSearchParams()
let rerenderProfile: (() => void) | undefined
const replaceMock = vi.fn((href: string) => {
	const query = href.startsWith("?") ? href.slice(1) : href
	currentSearchParams = new URLSearchParams(query)
	const rerender = rerenderProfile
	if (rerender) queueMicrotask(rerender)
})

function renderProfilePageWithStatefulSearchParams(queryClient?: QueryClient) {
	const rendered = renderWithProviders(<ProfilePage />, { queryClient })
	rerenderProfile = () => rendered.rerender(<ProfilePage />)
	return rendered
}

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

function activityResponseForPage(page: string) {
	return HttpResponse.json(
		{
			events:
				page === "3"
					? [
							{
								id: "activity-page-3",
								type: "LOGIN",
								description: "Login da página 3",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						]
					: [],
			pagination: {
				page: Number(page),
				pageSize: 20,
				total: 47,
				totalPages: 3,
			},
		},
		{ status: 200 },
	)
}

function activityTransitionResponseForPage(page: string) {
	return HttpResponse.json(
		{
			events: [
				{
					id: `activity-page-${page}`,
					type: "LOGIN",
					description: `Login da página ${page}`,
					occurredAt: "2025-01-10T12:00:00.000Z",
				},
			],
			pagination: {
				page: Number(page),
				pageSize: 20,
				total: 41,
				totalPages: 3,
			},
		},
		{ status: 200 },
	)
}

describe("ProfilePage", () => {
	beforeEach(() => {
		replaceMock.mockClear()
		currentSearchParams = new URLSearchParams()
		rerenderProfile = undefined
		vi.mocked(useRouter).mockReturnValue({
			replace: replaceMock,
		} as unknown as ReturnType<typeof useRouter>)
		vi.mocked(useSearchParams).mockImplementation(
			() =>
				currentSearchParams as unknown as ReturnType<typeof useSearchParams>,
		)
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
	beforeEach(() => {
		replaceMock.mockClear()
		currentSearchParams = new URLSearchParams()
		rerenderProfile = undefined
		vi.mocked(useRouter).mockReturnValue({
			replace: replaceMock,
		} as unknown as ReturnType<typeof useRouter>)
		vi.mocked(useSearchParams).mockImplementation(
			() =>
				currentSearchParams as unknown as ReturnType<typeof useSearchParams>,
		)
		mockProfileApis()
	})

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

	test("lê página da URL, envia na requisição e atualiza somente page", async () => {
		const user = userEvent.setup()
		const requestedPages: string[] = []
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, ({ request }) => {
				const requestedPage =
					new URL(request.url).searchParams.get("page") ?? ""
				requestedPages.push(requestedPage)
				return HttpResponse.json(
					{
						events: [
							{
								id: `activity-page-${requestedPage}`,
								type: "LOGIN",
								description: `Login da página ${requestedPage}`,
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						],
						pagination: {
							page: Number(requestedPage),
							pageSize: 20,
							total: 47,
							totalPages: 3,
						},
					},
					{ status: 200 },
				)
			}),
		)
		currentSearchParams = new URLSearchParams("filter=all&page=2")

		renderProfilePageWithStatefulSearchParams()

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByText("Login da página 2")).toBeInTheDocument()
		expect(requestedPages).toEqual(["2"])
		expect(screen.getByTestId("activity-page-2")).toHaveAttribute(
			"aria-current",
			"page",
		)

		await user.click(screen.getByTestId("activity-next"))

		expect(replaceMock).toHaveBeenCalledWith("?filter=all&page=3")
		expect(await screen.findByText("Login da página 3")).toBeInTheDocument()
		expect(requestedPages).toEqual(["2", "3"])
		expect(screen.getByTestId("activity-page-3")).toHaveAttribute(
			"aria-current",
			"page",
		)
	})

	test("canonicaliza inteiro inseguro da URL para página padrão sem repetir replace", async () => {
		const user = userEvent.setup()
		const unsafePage = "9007199254740992"
		const requestedPages: string[] = []
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, ({ request }) => {
				const requestedPage =
					new URL(request.url).searchParams.get("page") ?? ""
				requestedPages.push(requestedPage)

				if (requestedPage === unsafePage) {
					return HttpResponse.json(
						{ message: "Invalid query params" },
						{ status: 400 },
					)
				}

				return HttpResponse.json(
					{
						events: [
							{
								id: "activity-page-1",
								type: "LOGIN",
								description: "Login da página 1",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						],
						pagination: {
							page: Number(requestedPage),
							pageSize: 20,
							total: 1,
							totalPages: 1,
						},
					},
					{ status: 200 },
				)
			}),
		)
		currentSearchParams = new URLSearchParams(`page=${unsafePage}`)

		const rendered = renderProfilePageWithStatefulSearchParams()
		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})
		await user.click(rendered.getByRole("tab", { name: "Atividade" }))

		await waitFor(() => {
			expect(replaceMock).toHaveBeenCalledWith("?")
		})
		expect(replaceMock).toHaveBeenCalledTimes(1)
		expect(currentSearchParams.has("page")).toBe(false)
		expect(requestedPages).toEqual(["1"])
		expect(await screen.findByText("Login da página 1")).toBeInTheDocument()
	})

	test("normaliza página fora do intervalo para última página com atividades", async () => {
		const user = userEvent.setup()
		const requestedPages: string[] = []
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, async ({ request }) => {
				const requestedPage =
					new URL(request.url).searchParams.get("page") ?? ""
				requestedPages.push(requestedPage)
				if (requestedPage === "3") {
					await new Promise((resolve) => setTimeout(resolve, 50))
				}
				return activityResponseForPage(requestedPage)
			}),
		)
		currentSearchParams = new URLSearchParams("page=999")

		renderProfilePageWithStatefulSearchParams()

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		await waitFor(() => {
			expect(replaceMock).toHaveBeenCalledWith("?page=3")
		})
		await waitFor(() => {
			expect(screen.getByTestId("activity-tab-skeleton")).toBeInTheDocument()
			expect(
				screen.queryByText("Sem dados de atividade disponíveis"),
			).not.toBeInTheDocument()
		})
		expect(requestedPages).toEqual(["999", "3"])

		expect(await screen.findByText("Login da página 3")).toBeInTheDocument()
		expect(
			screen.queryByText("Sem dados de atividade disponíveis"),
		).not.toBeInTheDocument()
		expect(screen.getByTestId("activity-page-3")).toHaveAttribute(
			"aria-current",
			"page",
		)
	})

	test("normaliza página fora do intervalo quando o histórico está vazio", async () => {
		const user = userEvent.setup()
		const requestedPages: string[] = []
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, ({ request }) => {
				requestedPages.push(new URL(request.url).searchParams.get("page") ?? "")
				return HttpResponse.json(
					{
						events: [],
						pagination: {
							page: 999,
							pageSize: 20,
							total: 0,
							totalPages: 0,
						},
					},
					{ status: 200 },
				)
			}),
		)
		currentSearchParams = new URLSearchParams("page=999")

		renderProfilePageWithStatefulSearchParams()

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		await waitFor(() => {
			expect(replaceMock).toHaveBeenCalledWith("?")
		})
		expect(currentSearchParams.has("page")).toBe(false)
		expect(requestedPages).toEqual(["999", "1"])
	})

	test("não recupera página durante transição com metadata placeholder anterior", async () => {
		const user = userEvent.setup()
		const requestedPages: string[] = []
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, async ({ request }) => {
				const requestedPage =
					new URL(request.url).searchParams.get("page") ?? ""
				requestedPages.push(requestedPage)
				if (requestedPage === "3") {
					await new Promise((resolve) => setTimeout(resolve, 50))
				}
				return activityTransitionResponseForPage(requestedPage)
			}),
		)
		currentSearchParams = new URLSearchParams("page=2")

		renderProfilePageWithStatefulSearchParams()

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})
		await user.click(screen.getByRole("tab", { name: "Atividade" }))
		expect(await screen.findByText("Login da página 2")).toBeInTheDocument()

		await user.click(screen.getByTestId("activity-next"))

		await waitFor(() => {
			expect(requestedPages).toEqual(["2", "3"])
		})
		expect(replaceMock).toHaveBeenCalledWith("?page=3")
		expect(screen.getByTestId("activity-tab")).toHaveAttribute(
			"aria-busy",
			"true",
		)
		expect(screen.getByText("Login da página 2")).toBeInTheDocument()
		expect(replaceMock).not.toHaveBeenCalledWith("?page=2")
		expect(await screen.findByText("Login da página 3")).toBeInTheDocument()
	})

	test("aguarda refetch antes de recuperar página fora do intervalo com cache stale", async () => {
		const user = userEvent.setup()
		const requestedPages: string[] = []
		let releaseRefetch!: () => void
		const refetchGate = new Promise<void>((resolve) => {
			releaseRefetch = resolve
		})
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, async ({ request }) => {
				const requestedPage =
					new URL(request.url).searchParams.get("page") ?? ""
				requestedPages.push(requestedPage)
				await refetchGate
				return activityResponseForPage(requestedPage)
			}),
		)
		currentSearchParams = new URLSearchParams("page=999")
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, staleTime: 0, gcTime: 0 },
			},
		})
		queryClient.setQueryData(["user-activity", "me", 999], {
			events: [
				{
					id: "cached-activity",
					type: "LOGIN",
					description: "Atividade em cache",
					occurredAt: "2025-01-10T12:00:00.000Z",
				},
			],
			pagination: {
				page: 999,
				pageSize: 20,
				total: 47,
				totalPages: 3,
			},
		})

		renderProfilePageWithStatefulSearchParams(queryClient)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})
		await user.click(screen.getByRole("tab", { name: "Atividade" }))
		await waitFor(() => {
			expect(requestedPages).toEqual(["999"])
		})

		expect(replaceMock).not.toHaveBeenCalled()
		expect(screen.getByTestId("activity-tab")).toHaveAttribute(
			"aria-busy",
			"true",
		)
		expect(screen.getByText("Atividade em cache")).toBeInTheDocument()

		releaseRefetch()

		await waitFor(() => {
			expect(replaceMock).toHaveBeenCalledWith("?page=3")
		})
	})
})
