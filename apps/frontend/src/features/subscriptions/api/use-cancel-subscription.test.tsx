import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import {
	CANCEL_SUBSCRIPTION_MUTATION_KEY,
	useCancelSubscription,
} from "./use-cancel-subscription"
import { useMySubscription } from "./use-my-subscription"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const ACTIVE = {
	id: "sub-1",
	state: "active",
	plan: {
		id: "plan-anual",
		name: "Premium Anual",
		priceId: "price_demo_yearly",
	},
	currentPeriodStart: "2026-10-15T12:00:00.000Z",
	currentPeriodEnd: "2026-11-15T12:00:00.000Z",
	cancelAtPeriodEnd: false,
}
const SCHEDULED = {
	...ACTIVE,
	state: "cancel_scheduled",
	cancelAtPeriodEnd: true,
}

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

function useBoth() {
	return { query: useMySubscription(), cancel: useCancelSubscription() }
}

describe("useCancelSubscription", () => {
	it("dispara o POST e devolve a assinatura com cancelamento agendado", async () => {
		server.use(
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () =>
				HttpResponse.json(SCHEDULED),
			),
		)
		const { result } = renderHook(() => useCancelSubscription(), {
			wrapper: wrapper(),
		})

		const response = await result.current.mutateAsync()

		expect(response).toEqual(SCHEDULED)
	})

	it("invalida a consulta da assinatura no sucesso (a consulta é buscada de novo)", async () => {
		let getCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () => {
				getCalls += 1
				return HttpResponse.json(getCalls === 1 ? ACTIVE : SCHEDULED)
			}),
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () =>
				HttpResponse.json(SCHEDULED),
			),
		)
		const { result } = renderHook(() => useBoth(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))

		await result.current.cancel.mutateAsync()

		await waitFor(() =>
			expect(result.current.query.data).toMatchObject({
				cancelAtPeriodEnd: true,
			}),
		)
		expect(getCalls).toBe(2)
	})

	it("em 404 (sem assinatura ativa) rejeita com ApiError 404 e invalida a consulta", async () => {
		let getCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () => {
				getCalls += 1
				return HttpResponse.json(ACTIVE)
			}),
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () =>
				HttpResponse.json({ message: "no active" }, { status: 404 }),
			),
		)
		const { result } = renderHook(() => useBoth(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))

		await expect(result.current.cancel.mutateAsync()).rejects.toMatchObject({
			status: 404,
		})

		await waitFor(() => expect(getCalls).toBe(2))
	})

	it("expõe mutationKey estável", () => {
		expect(CANCEL_SUBSCRIPTION_MUTATION_KEY).toEqual([
			"subscriptions",
			"cancel",
		])
	})
})
