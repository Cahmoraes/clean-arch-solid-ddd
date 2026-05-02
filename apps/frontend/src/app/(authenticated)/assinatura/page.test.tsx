import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import SubscriptionPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("SubscriptionPage", () => {
	it("exibe aviso de demonstração visível sem interação", () => {
		renderWithProviders(<SubscriptionPage />)

		const banners = screen.getAllByTestId("subscription-demo-banner")
		expect(banners.length).toBeGreaterThan(0)
		for (const banner of banners) {
			expect(within(banner).getByText(/sem cobrança real/i)).toBeInTheDocument()
		}
	})

	it("envia priceId do plano selecionado e exibe confirmação com id retornado", async () => {
		const captured: {
			body: { priceId: string; paymentMethodId: string } | null
		} = { body: null }
		server.use(
			http.post(`${apiBaseUrl}/subscriptions`, async ({ request }) => {
				captured.body = (await request.json()) as {
					priceId: string
					paymentMethodId: string
				}
				return HttpResponse.json(
					{ subscriptionId: "sub_demo_xyz", status: "active" },
					{ status: 201 },
				)
			}),
		)

		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(screen.getByTestId("subscription-plan-premium-anual"))
		await user.click(screen.getByTestId("subscription-submit"))

		await waitFor(() => {
			expect(captured.body?.priceId).toBe("price_demo_yearly")
		})
		expect(captured.body?.paymentMethodId).toBe("pm_demo_card_visa")

		const confirmation = await screen.findByTestId("subscription-confirmation")
		expect(
			within(confirmation).getByTestId("subscription-confirmation-id"),
		).toHaveTextContent("sub_demo_xyz")
		expect(
			within(confirmation).getByTestId("subscription-confirmation-status"),
		).toHaveTextContent("active")
	})

	it("mostra estado de loading no botão durante a chamada", async () => {
		const resolveRef: { fn: (() => void) | null } = { fn: null }
		server.use(
			http.post(`${apiBaseUrl}/subscriptions`, async () => {
				await new Promise<void>((resolve) => {
					resolveRef.fn = resolve
				})
				return HttpResponse.json(
					{ subscriptionId: "sub_demo_loading", status: "active" },
					{ status: 201 },
				)
			}),
		)

		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(screen.getByTestId("subscription-submit"))

		const button = screen.getByTestId("subscription-submit")
		await waitFor(() => {
			expect(button).toBeDisabled()
			expect(button).toHaveTextContent(/processando/i)
			expect(button).toHaveAttribute("aria-busy", "true")
		})

		resolveRef.fn?.()
		await screen.findByTestId("subscription-confirmation")
	})

	it("exibe mensagem amigável quando o backend falha", async () => {
		server.use(
			http.post(`${apiBaseUrl}/subscriptions`, () =>
				HttpResponse.json({ message: "boom" }, { status: 500 }),
			),
		)

		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(screen.getByTestId("subscription-submit"))

		const alert = await screen.findByTestId("subscription-error")
		expect(alert.textContent).toMatch(/erro interno|tente novamente/i)
		expect(alert.textContent ?? "").not.toMatch(/500|stack/i)
	})
})
