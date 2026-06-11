import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import {
	SUBSCRIPTIONS_MUTATION_KEY,
	useCreateSubscription,
} from "./use-create-subscription"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

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

describe("useCreateSubscription", () => {
	it("envia priceId e paymentMethodId e retorna a subscription criada", async () => {
		let received: { priceId: string; paymentMethodId: string } | null = null
		server.use(
			http.post(`${apiBaseUrl}/subscriptions`, async ({ request }) => {
				received = (await request.json()) as {
					priceId: string
					paymentMethodId: string
				}
				return HttpResponse.json(
					{ subscriptionId: "sub_demo_42", status: "active" },
					{ status: 201 },
				)
			}),
		)

		const { result } = renderHook(() => useCreateSubscription(), {
			wrapper: wrapper(),
		})

		const response = await result.current.mutateAsync({
			priceId: "price_demo_monthly",
			paymentMethodId: "pm_demo_card_visa",
		})

		expect(response).toEqual({
			subscriptionId: "sub_demo_42",
			status: "active",
		})
		expect(received).toEqual({
			priceId: "price_demo_monthly",
			paymentMethodId: "pm_demo_card_visa",
		})
	})

	it("propaga ApiError quando backend retorna 401", async () => {
		server.use(
			http.post(`${apiBaseUrl}/subscriptions`, () =>
				HttpResponse.json({ message: "no" }, { status: 401 }),
			),
		)

		const { result } = renderHook(() => useCreateSubscription(), {
			wrapper: wrapper(),
		})

		await expect(
			result.current.mutateAsync({
				priceId: "price_demo_monthly",
				paymentMethodId: "pm_demo_card_visa",
			}),
		).rejects.toMatchObject({ status: 401 })
	})

	it("não retenta automaticamente em caso de falha", async () => {
		let calls = 0
		server.use(
			http.post(`${apiBaseUrl}/subscriptions`, () => {
				calls += 1
				return HttpResponse.json({ message: "boom" }, { status: 500 })
			}),
		)

		const { result } = renderHook(() => useCreateSubscription(), {
			wrapper: wrapper(),
		})

		await expect(
			result.current.mutateAsync({
				priceId: "price_demo_monthly",
				paymentMethodId: "pm_demo_card_visa",
			}),
		).rejects.toMatchObject({ status: 500 })

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(calls).toBe(1)
	})

	it("expõe mutationKey estável para coordenação de cache", () => {
		expect(SUBSCRIPTIONS_MUTATION_KEY).toEqual(["subscriptions", "create"])
	})
})
