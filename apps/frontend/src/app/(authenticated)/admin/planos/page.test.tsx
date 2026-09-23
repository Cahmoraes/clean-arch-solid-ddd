import { fireEvent, screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminPlansPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const PLAN_ACTIVE = {
	id: "plan-active",
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Acesso ilimitado.",
	features: ["Check-ins ilimitados"],
	isActive: true,
	stripePriceId: "",
}

const PLAN_INACTIVE = {
	id: "plan-inactive",
	name: "Premium Anual",
	priceCents: 47900,
	billingPeriod: "yearly",
	tagline: "Economia anual.",
	features: ["Tudo do mensal"],
	isActive: false,
	stripePriceId: "",
}

describe("AdminPlansPage", () => {
	test("lista planos ativos e inativos com selo de status", async () => {
		server.use(
			http.get(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json([PLAN_ACTIVE, PLAN_INACTIVE], { status: 200 }),
			),
		)

		renderWithProviders(<AdminPlansPage />)

		await waitFor(() =>
			expect(screen.getByText("Premium Mensal")).toBeInTheDocument(),
		)
		expect(screen.getByText("Premium Anual")).toBeInTheDocument()
		expect(screen.getByText("Ativo")).toBeInTheDocument()
		expect(screen.getByText("Inativo")).toBeInTheDocument()
	})

	test("lista vazia mostra empty state", async () => {
		server.use(
			http.get(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json([], { status: 200 }),
			),
		)

		renderWithProviders(<AdminPlansPage />)

		await waitFor(() =>
			expect(screen.getByText(/nenhum plano cadastrado/i)).toBeInTheDocument(),
		)
	})

	test("inativar um plano ativo chama PATCH /admin/plans/:id/inactivate", async () => {
		server.use(
			http.get(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json([PLAN_ACTIVE], { status: 200 }),
			),
		)
		let called = false
		server.use(
			http.patch(`${apiBaseUrl}/admin/plans/:id/inactivate`, () => {
				called = true
				return HttpResponse.json(
					{ ...PLAN_ACTIVE, isActive: false },
					{ status: 200 },
				)
			}),
		)

		renderWithProviders(<AdminPlansPage />)
		await waitFor(() =>
			expect(screen.getByText("Premium Mensal")).toBeInTheDocument(),
		)

		fireEvent.click(
			screen.getByRole("button", { name: /inativar premium mensal/i }),
		)
		fireEvent.click(
			screen.getByRole("button", { name: /confirmar inativação/i }),
		)

		await waitFor(() => expect(called).toBe(true))
	})
})
