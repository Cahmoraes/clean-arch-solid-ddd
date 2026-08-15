import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { userActivityQueryKey, useUserActivity } from "./use-user-activity"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe("useUserActivity", () => {
	test("retorna a lista de eventos tipada do MSW quando userId é fornecido", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, ({ params }) => {
				expect(params.userId).toBe("user-1")
				return HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						],
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(() => useUserActivity("user-1"), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toHaveLength(1)
		expect(result.current.data?.[0].description).toBe("Login realizado")
	})

	test("chama /users/me/activity quando userId é undefined e usa query key me", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () =>
				HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "CHECK_IN",
								description: "Check-in realizado",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						],
					},
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useUserActivity(undefined), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toHaveLength(1)
		expect(userActivityQueryKey(undefined)).toEqual(["user-activity", "me"])
	})

	test("não dispara a busca quando enabled é false", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, () => {
				throw new Error("não deveria ser chamado")
			}),
		)

		const { result } = renderHook(
			() => useUserActivity("user-1", { enabled: false }),
			{ wrapper: wrapper() },
		)

		expect(result.current.isPending).toBe(true)
		expect(result.current.fetchStatus).toBe("idle")
	})
})
