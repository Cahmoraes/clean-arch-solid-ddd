import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { CHANGE_PLAN_MUTATION_KEY, useChangePlan } from "./use-change-plan"
import { useMySubscription } from "./use-my-subscription"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const SUBSCRIPTION = {
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
	return { query: useMySubscription(), change: useChangePlan() }
}

describe("useChangePlan", () => {
	it("envia o priceId no PATCH e devolve a assinatura atualizada", async () => {
		let received: { priceId: string } | null = null
		server.use(
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, async ({ request }) => {
				received = (await request.json()) as { priceId: string }
				return HttpResponse.json(SUBSCRIPTION)
			}),
		)
		const { result } = renderHook(() => useChangePlan(), { wrapper: wrapper() })

		const response = await result.current.mutateAsync({
			priceId: "price_demo_yearly",
		})

		expect(response).toEqual(SUBSCRIPTION)
		expect(received).toEqual({ priceId: "price_demo_yearly" })
	})

	it("invalida a consulta da assinatura no sucesso (a consulta é buscada de novo)", async () => {
		let getCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () => {
				getCalls += 1
				return HttpResponse.json(SUBSCRIPTION)
			}),
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, () =>
				HttpResponse.json(SUBSCRIPTION),
			),
		)
		const { result } = renderHook(() => useBoth(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
		expect(getCalls).toBe(1)

		await result.current.change.mutateAsync({ priceId: "price_demo_yearly" })

		await waitFor(() => expect(getCalls).toBe(2))
	})

	it("em 409 (cancelamento agendado) rejeita com ApiError 409 e também invalida a consulta", async () => {
		let getCalls = 0
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () => {
				getCalls += 1
				return HttpResponse.json(SUBSCRIPTION)
			}),
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, () =>
				HttpResponse.json({ message: "conflict" }, { status: 409 }),
			),
		)
		const { result } = renderHook(() => useBoth(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))

		await expect(
			result.current.change.mutateAsync({ priceId: "price_demo_yearly" }),
		).rejects.toMatchObject({ status: 409 })

		await waitFor(() => expect(getCalls).toBe(2))
	})

	it("não retenta automaticamente em caso de falha", async () => {
		let calls = 0
		server.use(
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, () => {
				calls += 1
				return HttpResponse.json({ message: "boom" }, { status: 500 })
			}),
		)
		const { result } = renderHook(() => useChangePlan(), { wrapper: wrapper() })

		await expect(
			result.current.mutateAsync({ priceId: "price_demo_yearly" }),
		).rejects.toMatchObject({ status: 500 })

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(calls).toBe(1)
	})

	it("expõe mutationKey estável", () => {
		expect(CHANGE_PLAN_MUTATION_KEY).toEqual(["subscriptions", "change-plan"])
	})
})
