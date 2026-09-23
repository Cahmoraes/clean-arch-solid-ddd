import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import {
	MY_SUBSCRIPTION_QUERY_KEY,
	useMySubscription,
} from "./use-my-subscription"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const ACTIVE_SUBSCRIPTION = {
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

describe("useMySubscription", () => {
	it("devolve a assinatura vigente com plano, período e cancelAtPeriodEnd", async () => {
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () =>
				HttpResponse.json(ACTIVE_SUBSCRIPTION),
			),
		)

		const { result } = renderHook(() => useMySubscription(), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(ACTIVE_SUBSCRIPTION)
	})

	it("trata a ausência de assinatura (200 com null) como resultado normal, não como erro", async () => {
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () =>
				HttpResponse.json(null, { status: 200 }),
			),
		)

		const { result } = renderHook(() => useMySubscription(), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toBeNull()
		expect(result.current.isError).toBe(false)
	})

	it("usa o handler padrão do MSW (sem assinatura) quando o teste não sobrescreve", async () => {
		const { result } = renderHook(() => useMySubscription(), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toBeNull()
	})

	it("expõe ApiError quando o backend falha", async () => {
		server.use(
			http.get(`${apiBaseUrl}/subscriptions/me`, () =>
				HttpResponse.json({ message: "boom" }, { status: 500 }),
			),
		)

		const { result } = renderHook(() => useMySubscription(), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error).toMatchObject({ status: 500 })
	})

	it("expõe query key estável", () => {
		expect(MY_SUBSCRIPTION_QUERY_KEY).toEqual(["subscriptions", "me"])
	})
})
