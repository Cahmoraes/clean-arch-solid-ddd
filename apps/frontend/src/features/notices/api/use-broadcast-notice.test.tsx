import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { ApiError } from "@/lib/errors"
import { server } from "@/test/msw/server"
import { useBroadcastNotice } from "./use-broadcast-notice"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
const BROADCAST_URL = `${apiBaseUrl}/api/v1/notifications/broadcast`

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity, staleTime: 0 },
			mutations: { retry: false },
		},
	})
}

function wrapper(
	queryClient: QueryClient,
): (props: { children: ReactNode }) => React.JSX.Element {
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe("useBroadcastNotice", () => {
	test("envia título e mensagem e devolve o número de destinatários (handler padrão)", async () => {
		const { result } = renderHook(() => useBroadcastNotice(), {
			wrapper: wrapper(makeQueryClient()),
		})

		await act(async () => {
			await result.current.mutateAsync({
				title: "Manutenção",
				message: "Sistema fora do ar às 22h.",
			})
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual({ recipients: 3 })
	})

	test("envia o corpo { title, message } para POST /api/v1/notifications/broadcast", async () => {
		let receivedBody: unknown
		server.use(
			http.post(BROADCAST_URL, async ({ request }) => {
				receivedBody = await request.json()
				return HttpResponse.json({ recipients: 1 }, { status: 201 })
			}),
		)
		const { result } = renderHook(() => useBroadcastNotice(), {
			wrapper: wrapper(makeQueryClient()),
		})

		await act(async () => {
			await result.current.mutateAsync({ title: "Aviso", message: "Mensagem" })
		})

		expect(receivedBody).toEqual({ title: "Aviso", message: "Mensagem" })
		await waitFor(() => expect(result.current.data).toEqual({ recipients: 1 }))
	})

	test("erro do servidor vira ApiError com o status", async () => {
		server.use(
			http.post(BROADCAST_URL, () =>
				HttpResponse.json({ message: "Erro" }, { status: 500 }),
			),
		)
		const { result } = renderHook(() => useBroadcastNotice(), {
			wrapper: wrapper(makeQueryClient()),
		})

		await act(async () => {
			await expect(
				result.current.mutateAsync({ title: "Aviso", message: "Mensagem" }),
			).rejects.toBeInstanceOf(ApiError)
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error).toBeInstanceOf(ApiError)
		expect(result.current.error?.status).toBe(500)
	})
})
