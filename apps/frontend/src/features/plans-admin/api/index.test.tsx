import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { plansAdminKeys, useCreatePlan, usePlans } from "./index"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const STUB_PLAN = {
	id: "plan-1",
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Tagline.",
	features: ["Check-ins ilimitados"],
	isActive: true,
	stripePriceId: "",
}

function wrapper(
	queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	}),
): {
	Wrapper: (props: { children: ReactNode }) => React.JSX.Element
	queryClient: QueryClient
} {
	return {
		Wrapper: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
		queryClient,
	}
}

describe("usePlans", () => {
	test("busca a lista de planos administrativos", async () => {
		server.use(
			http.get(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json([STUB_PLAN], { status: 200 }),
			),
		)
		const { Wrapper } = wrapper()

		const { result } = renderHook(() => usePlans(), { wrapper: Wrapper })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual([STUB_PLAN])
	})
})

describe("useCreatePlan", () => {
	test("cria um plano e invalida a lista administrativa", async () => {
		server.use(
			http.post(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json(STUB_PLAN, { status: 201 }),
			),
		)
		const { Wrapper, queryClient } = wrapper()
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

		const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper })
		await result.current.mutateAsync({
			name: "Premium Mensal",
			price: 49.9,
			billingPeriod: "monthly",
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
			stripePriceId: "",
		})

		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: plansAdminKeys.all,
		})
	})
})
