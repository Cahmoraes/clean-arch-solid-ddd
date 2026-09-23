import { fireEvent, screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { PlanFormDialog } from "./plan-form-dialog"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("PlanFormDialog — criação", () => {
	test("envia priceCents calculado a partir do preço em reais e chama onSuccess", async () => {
		let receivedBody: Record<string, unknown> | null = null
		server.use(
			http.post(`${apiBaseUrl}/admin/plans`, async ({ request }) => {
				receivedBody = (await request.json()) as Record<string, unknown>
				return HttpResponse.json(
					{
						id: "plan-new",
						name: "Premium Mensal",
						priceCents: 4990,
						billingPeriod: "monthly",
						tagline: "Tagline.",
						features: ["Check-ins ilimitados"],
						isActive: true,
						stripePriceId: "",
					},
					{ status: 201 },
				)
			}),
		)
		const onSuccess = vi.fn()

		renderWithProviders(
			<PlanFormDialog
				open
				plan={null}
				onOpenChange={() => {}}
				onSuccess={onSuccess}
			/>,
		)

		fireEvent.change(screen.getByLabelText(/nome/i), {
			target: { value: "Premium Mensal" },
		})
		fireEvent.change(screen.getByLabelText(/preço/i), {
			target: { value: "49.90" },
		})
		fireEvent.change(screen.getByLabelText(/tagline/i), {
			target: { value: "Tagline." },
		})
		fireEvent.change(screen.getByLabelText(/benefícios/i), {
			target: { value: "Check-ins ilimitados" },
		})
		fireEvent.click(screen.getByRole("button", { name: /salvar plano/i }))

		await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
		expect(receivedBody).toMatchObject({
			name: "Premium Mensal",
			priceCents: 4990,
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		})
	})

	test("preço negativo mostra erro no campo e não envia a requisição", async () => {
		let called = false
		server.use(
			http.post(`${apiBaseUrl}/admin/plans`, () => {
				called = true
				return HttpResponse.json({}, { status: 201 })
			}),
		)

		renderWithProviders(
			<PlanFormDialog open plan={null} onOpenChange={() => {}} />,
		)

		fireEvent.change(screen.getByLabelText(/nome/i), {
			target: { value: "Premium Mensal" },
		})
		fireEvent.change(screen.getByLabelText(/preço/i), {
			target: { value: "-1" },
		})
		fireEvent.change(screen.getByLabelText(/tagline/i), {
			target: { value: "Tagline." },
		})
		fireEvent.change(screen.getByLabelText(/benefícios/i), {
			target: { value: "Check-ins ilimitados" },
		})
		fireEvent.click(screen.getByRole("button", { name: /salvar plano/i }))

		await waitFor(() =>
			expect(
				screen.getByText(/preço não pode ser negativo/i),
			).toBeInTheDocument(),
		)
		expect(called).toBe(false)
	})
})

describe("PlanFormDialog — edição", () => {
	test("pré-preenche os campos a partir do plano recebido, sem campo de status", async () => {
		const plan = {
			id: "plan-1",
			name: "Premium Anual",
			priceCents: 47900,
			billingPeriod: "yearly" as const,
			tagline: "Economia anual.",
			features: ["Tudo do mensal"],
			isActive: true,
			stripePriceId: "price_demo_yearly",
		}

		renderWithProviders(
			<PlanFormDialog open plan={plan} onOpenChange={() => {}} />,
		)

		expect(screen.getByLabelText(/nome/i)).toHaveValue("Premium Anual")
		expect(screen.getByLabelText(/preço/i)).toHaveValue(479)
		expect(screen.getByLabelText(/tagline/i)).toHaveValue("Economia anual.")
		expect(
			screen.queryByLabelText(/status|ativo|inativo/i),
		).not.toBeInTheDocument()
	})
})
