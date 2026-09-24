import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import SubscriptionPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const STUB_PLANS = [
	{
		id: "plan-mensal",
		name: "Premium Mensal",
		priceId: "price_demo_monthly",
		priceLabel: "R$ 49,90/mês",
		tagline: "Tagline mensal.",
		features: ["Check-ins ilimitados"],
	},
	{
		id: "plan-anual",
		name: "Premium Anual",
		priceId: "price_demo_yearly",
		priceLabel: "R$ 479,00/ano",
		tagline: "Tagline anual.",
		features: ["Tudo do mensal"],
	},
]

describe("SubscriptionPage", () => {
	beforeEach(() => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(STUB_PLANS)),
		)
	})

	it("exibe aviso de demonstração visível sem interação", async () => {
		renderWithProviders(<SubscriptionPage />)

		const banners = await screen.findAllByTestId("subscription-demo-banner")
		expect(banners.length).toBeGreaterThan(0)
		for (const banner of banners) {
			expect(within(banner).getByText(/sem cobrança real/i)).toBeInTheDocument()
		}
	})

	it("o ícone do aviso de demonstração usa o âmbar semântico", async () => {
		renderWithProviders(<SubscriptionPage />)

		const [banner] = await screen.findAllByTestId("subscription-demo-banner")
		expect(banner.querySelector("svg")).toHaveClass("text-warning")
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

		await user.click(await screen.findByTestId("subscription-plan-plan-anual"))
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

		await user.click(await screen.findByTestId("subscription-submit"))

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

		await user.click(await screen.findByTestId("subscription-submit"))

		const alert = await screen.findByTestId("subscription-error")
		expect(alert.textContent).toMatch(/erro interno|tente novamente/i)
		expect(alert.textContent ?? "").not.toMatch(/500|stack/i)
	})
})

const PLAN_ANUAL = {
	id: "plan-anual",
	name: "Premium Anual",
	priceId: "price_demo_yearly",
}
const PLAN_MENSAL = {
	id: "plan-mensal",
	name: "Premium Mensal",
	priceId: "price_demo_monthly",
}

function makeSubscription(overrides: Record<string, unknown> = {}) {
	return {
		id: "sub-1",
		state: "active",
		plan: PLAN_ANUAL,
		currentPeriodStart: "2026-10-15T12:00:00.000Z",
		currentPeriodEnd: "2026-11-15T12:00:00.000Z",
		cancelAtPeriodEnd: false,
		...overrides,
	}
}

function serveSubscription(initial: Record<string, unknown> | null) {
	const state = { current: initial, getCalls: 0 }
	server.use(
		http.get(`${apiBaseUrl}/subscriptions/me`, () => {
			state.getCalls += 1
			return HttpResponse.json(state.current)
		}),
	)
	return state
}

describe("SubscriptionPage com assinatura", () => {
	beforeEach(() => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(STUB_PLANS)),
		)
	})

	it("pré-seleciona o plano vigente e marca Plano atual só nele", async () => {
		serveSubscription(makeSubscription())
		renderWithProviders(<SubscriptionPage />)

		const annual = await screen.findByTestId("subscription-plan-plan-anual")
		const monthly = screen.getByTestId("subscription-plan-plan-mensal")

		expect(annual).toHaveAttribute("data-selected", "true")
		expect(monthly).toHaveAttribute("data-selected", "false")
		expect(within(annual).getByText("Plano atual")).toBeInTheDocument()
		expect(within(monthly).queryByText("Plano atual")).not.toBeInTheDocument()
	})

	it("mostra dados reais no banner, sem o texto fixo de 30 dias", async () => {
		serveSubscription(makeSubscription())
		renderWithProviders(<SubscriptionPage />)

		const banner = await screen.findByTestId("billing-banner")

		expect(banner).toHaveTextContent("Premium Anual")
		expect(banner).toHaveTextContent("R$ 479,00/ano")
		expect(banner).toHaveTextContent("15/11/2026")
		expect(banner).not.toHaveTextContent(/30 dias/)
	})

	it("oferece Trocar plano no lugar de Assinar e só habilita com outro plano selecionado", async () => {
		serveSubscription(makeSubscription())
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		const change = await screen.findByRole("button", { name: "Trocar plano" })

		expect(
			screen.queryByRole("button", { name: /assinar plano demo/i }),
		).not.toBeInTheDocument()
		expect(change).toBeDisabled()

		await user.click(screen.getByTestId("subscription-plan-plan-mensal"))

		expect(screen.getByRole("button", { name: "Trocar plano" })).toBeEnabled()
	})

	it("troca de plano enviando o priceId escolhido e passa a marcar o novo plano como atual", async () => {
		const state = serveSubscription(makeSubscription())
		let received: { priceId: string } | null = null
		server.use(
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, async ({ request }) => {
				received = (await request.json()) as { priceId: string }
				state.current = makeSubscription({ plan: PLAN_MENSAL })
				return HttpResponse.json(state.current)
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(await screen.findByTestId("subscription-plan-plan-mensal"))
		await user.click(screen.getByRole("button", { name: "Trocar plano" }))

		await waitFor(() => {
			expect(received).toEqual({ priceId: "price_demo_monthly" })
		})
		const monthly = screen.getByTestId("subscription-plan-plan-mensal")
		await waitFor(() => {
			expect(within(monthly).getByText("Plano atual")).toBeInTheDocument()
		})
		expect(
			within(screen.getByTestId("subscription-plan-plan-anual")).queryByText(
				"Plano atual",
			),
		).not.toBeInTheDocument()
	})

	it("cancela ao fim do período, mostra a data de fim e deixa de oferecer a troca", async () => {
		const state = serveSubscription(makeSubscription())
		server.use(
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () => {
				state.current = makeSubscription({
					state: "cancel_scheduled",
					cancelAtPeriodEnd: true,
				})
				return HttpResponse.json(state.current)
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(
			await screen.findByRole("button", { name: "Cancelar assinatura" }),
		)
		await user.click(
			await screen.findByRole("button", { name: "Confirmar cancelamento" }),
		)

		const notice = await screen.findByTestId("subscription-cancellation-notice")
		expect(notice).toHaveTextContent("15/11/2026")
		expect(screen.getByTestId("billing-banner")).toHaveTextContent(
			/cancelamento agendado/i,
		)
		expect(
			screen.queryByRole("button", { name: "Trocar plano" }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Cancelar assinatura" }),
		).not.toBeInTheDocument()
	})

	it("abre a confirmação ao clicar em Cancelar assinatura e não envia requisição antes de confirmar", async () => {
		const state = serveSubscription(makeSubscription())
		let cancelCalls = 0
		server.use(
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () => {
				cancelCalls += 1
				state.current = makeSubscription({
					state: "cancel_scheduled",
					cancelAtPeriodEnd: true,
				})
				return HttpResponse.json(state.current)
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(
			await screen.findByRole("button", { name: "Cancelar assinatura" }),
		)

		expect(
			await screen.findByRole("alertdialog", { name: "Cancelar assinatura?" }),
		).toBeInTheDocument()
		expect(
			screen.getByText("Você mantém acesso até 15/11/2026", { exact: false }),
		).toBeInTheDocument()
		expect(cancelCalls).toBe(0)
	})

	it("dispensa a confirmação sem enviar requisição de cancelamento", async () => {
		const state = serveSubscription(makeSubscription())
		let cancelCalls = 0
		server.use(
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () => {
				cancelCalls += 1
				state.current = makeSubscription({
					state: "cancel_scheduled",
					cancelAtPeriodEnd: true,
				})
				return HttpResponse.json(state.current)
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(
			await screen.findByRole("button", { name: "Cancelar assinatura" }),
		)
		await user.click(
			await screen.findByRole("button", { name: "Manter assinatura" }),
		)

		await waitFor(() => {
			expect(
				screen.queryByRole("alertdialog", { name: "Cancelar assinatura?" }),
			).not.toBeInTheDocument()
		})
		expect(cancelCalls).toBe(0)
		expect(
			screen.getByRole("button", { name: "Cancelar assinatura" }),
		).toBeInTheDocument()
	})

	it("com cancelamento já agendado ao abrir, mostra a data de fim e não oferece troca", async () => {
		serveSubscription(
			makeSubscription({ state: "cancel_scheduled", cancelAtPeriodEnd: true }),
		)
		renderWithProviders(<SubscriptionPage />)

		const notice = await screen.findByTestId("subscription-cancellation-notice")

		expect(notice).toHaveTextContent("15/11/2026")
		expect(
			screen.queryByRole("button", { name: "Trocar plano" }),
		).not.toBeInTheDocument()
	})

	it("em 409 na troca mostra o motivo e recarrega a assinatura para o estado real", async () => {
		const state = serveSubscription(makeSubscription())
		server.use(
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, () => {
				state.current = makeSubscription({
					state: "cancel_scheduled",
					cancelAtPeriodEnd: true,
				})
				return HttpResponse.json({ message: "conflict" }, { status: 409 })
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(await screen.findByTestId("subscription-plan-plan-mensal"))
		await user.click(screen.getByRole("button", { name: "Trocar plano" }))

		const alert = await screen.findByTestId("subscription-error")
		expect(alert).toHaveTextContent(/cancelamento/i)
		expect(alert.textContent ?? "").not.toMatch(/409|conflict/i)
		await screen.findByTestId("subscription-cancellation-notice")
		expect(state.getCalls).toBeGreaterThanOrEqual(2)
		expect(
			screen.queryByRole("button", { name: "Trocar plano" }),
		).not.toBeInTheDocument()
	})

	it("mostra plano não identificado para assinatura legada e oferece trocar e cancelar", async () => {
		serveSubscription(makeSubscription({ plan: null }))
		renderWithProviders(<SubscriptionPage />)

		const banner = await screen.findByTestId("billing-banner")

		expect(banner).toHaveTextContent(/plano não identificado/i)
		expect(screen.getByRole("button", { name: "Trocar plano" })).toBeEnabled()
		expect(
			screen.getByRole("button", { name: "Cancelar assinatura" }),
		).toBeEnabled()
	})

	it("em 404 no cancelamento mostra a mensagem e volta ao fluxo de assinar", async () => {
		const state = serveSubscription(makeSubscription())
		server.use(
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () => {
				state.current = null
				return HttpResponse.json({ message: "no active" }, { status: 404 })
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(
			await screen.findByRole("button", { name: "Cancelar assinatura" }),
		)
		await user.click(
			await screen.findByRole("button", { name: "Confirmar cancelamento" }),
		)

		const alert = await screen.findByTestId("subscription-error")
		expect(alert).toHaveTextContent("Você não possui assinatura ativa")
		expect(
			await screen.findByRole("button", { name: /assinar plano demo/i }),
		).toBeInTheDocument()
	})

	it("com assinatura vencida mantém o fluxo de assinar, sem pré-seleção nem Plano atual", async () => {
		serveSubscription(
			makeSubscription({ state: "expired", cancelAtPeriodEnd: true }),
		)
		renderWithProviders(<SubscriptionPage />)

		const submit = await screen.findByRole("button", {
			name: /assinar plano demo/i,
		})

		expect(submit).toBeEnabled()
		expect(
			screen.queryByRole("button", { name: "Trocar plano" }),
		).not.toBeInTheDocument()
		expect(screen.queryByText("Plano atual", { selector: "span" })).toBeNull()
		expect(screen.getByTestId("subscription-plan-plan-mensal")).toHaveAttribute(
			"data-selected",
			"true",
		)
	})
})
