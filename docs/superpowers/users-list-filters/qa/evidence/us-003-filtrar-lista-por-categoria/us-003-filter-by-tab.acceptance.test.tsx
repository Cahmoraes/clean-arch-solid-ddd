import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, test } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminUsersPage from "@/app/(authenticated)/admin/usuarios/page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const EMPTY_STATS = {
	total: 50,
	members: 40,
	admins: 10,
	active: 45,
	inactive: 5,
}

function mockStatsEndpoint() {
	server.use(
		http.get(`${apiBaseUrl}/users/stats`, () =>
			HttpResponse.json(EMPTY_STATS, { status: 200 }),
		),
	)
}

function captureUsersRequest(
	onRequest: (url: URL) => void,
	users: object[] = [],
) {
	server.use(
		http.get(`${apiBaseUrl}/users`, ({ request }) => {
			onRequest(new URL(request.url))
			return HttpResponse.json(
				{ users, pagination: { page: 1, limit: 10, total: users.length } },
				{ status: 200 },
			)
		}),
	)
}

function renderPage() {
	return renderWithProviders(<AdminUsersPage />)
}

describe("US-003 — filtrar lista por categoria (tab)", () => {
	beforeEach(() => {
		useAuthStore.setState({
			accessToken: "token",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-id", role: "ADMIN" },
		})
		mockStatsEndpoint()
	})

	test("RF-007 — tab Membros envia role=MEMBER e não envia status", async () => {
		const user = userEvent.setup()
		let capturedUrl: URL | null = null
		captureUsersRequest((url) => {
			capturedUrl = url
		})

		renderPage()

		await user.click(await screen.findByRole("button", { name: /membros/i }))

		await waitFor(() => {
			expect(capturedUrl?.searchParams.get("role")).toBe("MEMBER")
		})
		expect(capturedUrl?.searchParams.has("status")).toBe(false)
	})

	test("RF-008 — tab Administradores envia role=ADMIN", async () => {
		const user = userEvent.setup()
		let capturedUrl: URL | null = null
		captureUsersRequest((url) => {
			capturedUrl = url
		})

		renderPage()

		await user.click(
			await screen.findByRole("button", { name: /administradores/i }),
		)

		await waitFor(() => {
			expect(capturedUrl?.searchParams.get("role")).toBe("ADMIN")
		})
	})

	test("RF-009 — tab Ativos envia status=active e não envia role", async () => {
		const user = userEvent.setup()
		let capturedUrl: URL | null = null
		captureUsersRequest((url) => {
			capturedUrl = url
		})

		renderPage()

		await user.click(await screen.findByRole("button", { name: /^ativos/i }))

		await waitFor(() => {
			expect(capturedUrl?.searchParams.get("status")).toBe("active")
		})
		expect(capturedUrl?.searchParams.has("role")).toBe(false)
	})

	test("RF-010 — tab Inativos envia status=inactive e não envia role", async () => {
		const user = userEvent.setup()
		let capturedUrl: URL | null = null
		captureUsersRequest((url) => {
			capturedUrl = url
		})

		renderPage()

		await user.click(await screen.findByRole("button", { name: /^inativos/i }))

		await waitFor(() => {
			expect(capturedUrl?.searchParams.get("status")).toBe("inactive")
		})
		expect(capturedUrl?.searchParams.has("role")).toBe(false)
	})

	test("RF-011 — tab Todos remove filtros role e status", async () => {
		const user = userEvent.setup()
		let capturedUrl: URL | null = null
		captureUsersRequest((url) => {
			capturedUrl = url
		})

		renderPage()

		// First click Membros to activate a filter
		await user.click(await screen.findByRole("button", { name: /membros/i }))
		await waitFor(() => {
			expect(capturedUrl?.searchParams.get("role")).toBe("MEMBER")
		})

		// Then click Todos to reset
		capturedUrl = null
		await user.click(screen.getByRole("button", { name: /todos/i }))

		await waitFor(() => {
			expect(capturedUrl).not.toBeNull()
		})
		expect(capturedUrl?.searchParams.has("role")).toBe(false)
		expect(capturedUrl?.searchParams.has("status")).toBe(false)
	})
})
