import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import AdminUsersPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function renderPage(): void {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)
	}
	render(<AdminUsersPage />, { wrapper: Wrapper })
}

function userFixture(id: string, idx: number) {
	return {
		id,
		name: `User ${idx}`,
		email: `user${idx}@example.com`,
		role: idx % 2 === 0 ? "ADMIN" : "MEMBER",
		status: idx % 2 === 0 ? "activated" : "suspended",
		createdAt: "2024-01-01T00:00:00.000Z",
	}
}

describe("AdminUsersPage", () => {
	test("exibe Skeleton durante o carregamento e depois lista", async () => {
		let resolveResponse: () => void = () => {}
		const responseGate = new Promise<void>((resolve) => {
			resolveResponse = resolve
		})
		server.use(
			http.get(`${apiBaseUrl}/users`, async () => {
				await responseGate
				return HttpResponse.json(
					{
						users: [userFixture("u1", 1)],
						pagination: { page: 1, limit: 10, total: 1 },
					},
					{ status: 200 },
				)
			}),
		)

		renderPage()
		expect(screen.getByTestId("admin-users-skeleton")).toBeInTheDocument()

		resolveResponse()

		await waitFor(() =>
			expect(screen.getByTestId("admin-users-list")).toBeInTheDocument(),
		)
		expect(screen.getByText("user1@example.com")).toBeInTheDocument()
	})

	test("exibe EmptyState quando lista está vazia", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, () =>
				HttpResponse.json(
					{ users: [], pagination: { page: 1, limit: 10, total: 0 } },
					{ status: 200 },
				),
			),
		)

		renderPage()

		await waitFor(() =>
			expect(
				screen.getByText(/nenhum usuário cadastrado/i),
			).toBeInTheDocument(),
		)
	})

	test("navega entre páginas via paginação", async () => {
		const requestedPages: string[] = []
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				const page = url.searchParams.get("page") ?? "1"
				requestedPages.push(page)
				return HttpResponse.json(
					{
						users: [userFixture(`u-${page}`, Number(page))],
						pagination: { page: Number(page), limit: 10, total: 25 },
					},
					{ status: 200 },
				)
			}),
		)

		const user = userEvent.setup()
		renderPage()

		await waitFor(() =>
			expect(screen.getByTestId("admin-users-list")).toBeInTheDocument(),
		)
		expect(screen.getByText("user1@example.com")).toBeInTheDocument()

		await user.click(screen.getByTestId("admin-users-next"))

		await waitFor(() => expect(requestedPages).toContain("2"))
		await waitFor(() =>
			expect(screen.getByText("user2@example.com")).toBeInTheDocument(),
		)

		await user.click(screen.getByTestId("admin-users-page-3"))
		await waitFor(() => expect(requestedPages).toContain("3"))
	})

	test("exibe mensagem de erro amigável em falha de rede", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, () =>
				HttpResponse.json({ message: "boom" }, { status: 500 }),
			),
		)

		renderPage()

		await waitFor(() =>
			expect(screen.getByTestId("admin-users-error")).toBeInTheDocument(),
		)
		expect(
			within(screen.getByTestId("admin-users-error")).getByText(/erro|tente/i),
		).toBeInTheDocument()
	})
})
