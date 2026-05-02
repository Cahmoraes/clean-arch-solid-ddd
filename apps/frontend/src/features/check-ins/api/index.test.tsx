import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { useCheckIns, useCreateCheckIn, useValidateCheckIn } from "./index"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return { Wrapper, queryClient }
}

describe("useCreateCheckIn", () => {
	it("envia payload e retorna id do check-in criado", async () => {
		let receivedBody: unknown = null
		server.use(
			http.post(`${apiBaseUrl}/check-ins`, async ({ request }) => {
				receivedBody = await request.json()
				return HttpResponse.json(
					{
						message: "Check-in created",
						id: "checkin-1",
						date: "2024-01-01T10:00:00Z",
					},
					{ status: 201 },
				)
			}),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useCreateCheckIn(), {
			wrapper: Wrapper,
		})
		const created = await result.current.mutateAsync({
			userId: "user-1",
			gymId: "gym-42",
			userLatitude: -23.5,
			userLongitude: -46.6,
		})
		expect(created.id).toBe("checkin-1")
		expect(receivedBody).toEqual({
			userId: "user-1",
			gymId: "gym-42",
			userLatitude: -23.5,
			userLongitude: -46.6,
		})
	})

	it("não retenta automaticamente em falha (retry: 0)", async () => {
		let calls = 0
		server.use(
			http.post(`${apiBaseUrl}/check-ins`, () => {
				calls += 1
				return HttpResponse.json({ message: "boom" }, { status: 500 })
			}),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useCreateCheckIn(), {
			wrapper: Wrapper,
		})
		await expect(
			result.current.mutateAsync({
				userId: "u1",
				gymId: "g1",
				userLatitude: 0,
				userLongitude: 0,
			}),
		).rejects.toMatchObject({ status: 500 })
		expect(calls).toBe(1)
	})

	it("propaga ApiError com status 409 (já fez check-in / muito longe)", async () => {
		server.use(
			http.post(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json({ message: "too far" }, { status: 409 }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useCreateCheckIn(), {
			wrapper: Wrapper,
		})
		await expect(
			result.current.mutateAsync({
				userId: "u1",
				gymId: "g1",
				userLatitude: 0,
				userLongitude: 0,
			}),
		).rejects.toMatchObject({ status: 409 })
	})
})

describe("useCheckIns", () => {
	it("retorna histórico paginado tipado do MSW", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, ({ request }) => {
				const url = new URL(request.url)
				expect(url.searchParams.get("page")).toBe("2")
				return HttpResponse.json(
					{
						items: [
							{
								id: "c1",
								gymId: "g1",
								gymTitle: "Iron Gym",
								validatedAt: null,
								createdAt: "2024-01-01T10:00:00Z",
							},
						],
						page: 2,
						total: 25,
					},
					{ status: 200 },
				)
			}),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useCheckIns({ page: 2 }), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.items).toHaveLength(1)
		expect(result.current.data?.page).toBe(2)
		expect(result.current.data?.total).toBe(25)
	})

	it("propaga ApiError quando backend retorna 401", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins`, () =>
				HttpResponse.json({ message: "unauth" }, { status: 401 }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useCheckIns({ page: 1 }), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error?.status).toBe(401)
	})
})

describe("useValidateCheckIn", () => {
	it("envia checkInId e invalida lista após sucesso", async () => {
		let receivedBody: unknown = null
		server.use(
			http.patch(`${apiBaseUrl}/check-ins/validate`, async ({ request }) => {
				receivedBody = await request.json()
				return HttpResponse.json({ checkInId: "c1" }, { status: 200 })
			}),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useValidateCheckIn(), {
			wrapper: Wrapper,
		})
		const id = await result.current.mutateAsync("c1")
		expect(id).toBe("c1")
		expect(receivedBody).toEqual({ checkInId: "c1" })
	})

	it("propaga ApiError em conflito 409", async () => {
		server.use(
			http.patch(`${apiBaseUrl}/check-ins/validate`, () =>
				HttpResponse.json({ message: "expired" }, { status: 409 }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useValidateCheckIn(), {
			wrapper: Wrapper,
		})
		await expect(result.current.mutateAsync("c1")).rejects.toMatchObject({
			status: 409,
		})
	})
})
