import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { delay, HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { ApiError } from "@/lib/errors"
import { DEFAULT_REQUEST_TIMEOUT_MS } from "@/lib/query-client"
import { server } from "@/test/msw/server"
import { feriadosQueryKey, useFeriadosQuery } from "./use-feriados-query"

function createWrapper(queryClient = createQueryClient()) {
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
		},
	})
}

describe("useFeriadosQuery", () => {
	test("busca e normaliza feriados nacionais por ano", async () => {
		server.use(
			http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
				HttpResponse.json([
					{
						date: "2026-01-01",
						name: " Confraternização Universal ",
						type: "national",
						weekday: "quinta-feira",
					},
				]),
			),
		)

		const { result } = renderHook(() => useFeriadosQuery(2026), {
			wrapper: createWrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual([
			{
				date: "2026-01-01",
				name: "Confraternização Universal",
				type: "national",
				isNational: true,
			},
		])
	})

	test("expõe estado de loading enquanto busca feriados", async () => {
		let resolveResponse: (response: Response) => void = () => undefined
		const responsePromise = new Promise<Response>((resolve) => {
			resolveResponse = resolve
		})
		server.use(
			http.get(
				"https://brasilapi.com.br/api/feriados/v1/2026",
				() => responsePromise,
			),
		)

		const { result } = renderHook(() => useFeriadosQuery(2026), {
			wrapper: createWrapper(),
		})

		expect(result.current.isPending).toBe(true)
		expect(result.current.fetchStatus).toBe("fetching")

		resolveResponse(HttpResponse.json([]))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("retorna ApiError quando a BrasilAPI falha", async () => {
		server.use(
			http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
				HttpResponse.json({ message: "indisponível" }, { status: 503 }),
			),
		)

		const { result } = renderHook(() => useFeriadosQuery(2026), {
			wrapper: createWrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 3_000,
		})
		expect(result.current.error).toBeInstanceOf(ApiError)
		expect(result.current.error?.code).toBe("holidays_unavailable")
	})

	test("retorna ApiError quando a rede falha", async () => {
		server.use(
			http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
				HttpResponse.error(),
			),
		)

		const { result } = renderHook(() => useFeriadosQuery(2026), {
			wrapper: createWrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 3_000,
		})
		expect(result.current.error).toBeInstanceOf(ApiError)
		expect(result.current.error?.code).toBe("holidays_unavailable")
	})

	test("não retenta erro HTTP não recuperável da BrasilAPI", async () => {
		let requestCount = 0
		server.use(
			http.get("https://brasilapi.com.br/api/feriados/v1/2026", () => {
				requestCount += 1
				return HttpResponse.json({ message: "não encontrado" }, { status: 404 })
			}),
		)

		const { result } = renderHook(() => useFeriadosQuery(2026), {
			wrapper: createWrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 3_000,
		})
		expect(result.current.error).toBeInstanceOf(ApiError)
		expect(result.current.error?.status).toBe(404)
		expect(requestCount).toBe(1)
	})

	test("permite refetch após erro recuperável", async () => {
		server.use(
			http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
				HttpResponse.json({ message: "indisponível" }, { status: 503 }),
			),
		)
		const { result } = renderHook(() => useFeriadosQuery(2026), {
			wrapper: createWrapper(),
		})
		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 3_000,
		})

		server.use(
			http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
				HttpResponse.json([
					{
						date: "2026-04-21",
						name: "Tiradentes",
						type: "national",
						weekday: "terça-feira",
					},
				]),
			),
		)

		await result.current.refetch()

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual([
			{
				date: "2026-04-21",
				name: "Tiradentes",
				type: "national",
				isNational: true,
			},
		])
	})

	test("mantém cache separado por ano selecionado", async () => {
		let requests2026 = 0
		server.use(
			http.get("https://brasilapi.com.br/api/feriados/v1/2026", () => {
				requests2026 += 1
				return HttpResponse.json([
					{
						date: "2026-01-01",
						name: "Confraternização Universal",
						type: "national",
						weekday: "quinta-feira",
					},
				])
			}),
			http.get("https://brasilapi.com.br/api/feriados/v1/2027", () =>
				HttpResponse.json([
					{
						date: "2027-09-07",
						name: "Independência do Brasil",
						type: "national",
						weekday: "terça-feira",
					},
				]),
			),
		)
		const queryClient = createQueryClient()
		const { result, rerender } = renderHook(
			({ year }: { year: number }) => useFeriadosQuery(year),
			{
				initialProps: { year: 2026 },
				wrapper: createWrapper(queryClient),
			},
		)

		await waitFor(() =>
			expect(result.current.data?.[0]?.date).toBe("2026-01-01"),
		)
		expect(queryClient.getQueryData(feriadosQueryKey(2026))).toEqual([
			{
				date: "2026-01-01",
				name: "Confraternização Universal",
				type: "national",
				isNational: true,
			},
		])

		rerender({ year: 2027 })
		await waitFor(() =>
			expect(result.current.data?.[0]?.date).toBe("2027-09-07"),
		)

		rerender({ year: 2026 })

		expect(result.current.data?.[0]?.date).toBe("2026-01-01")
		expect(result.current.fetchStatus).toBe("idle")
		expect(requests2026).toBe(1)
	})

	test("não dispara consulta quando ano é null", () => {
		const { result } = renderHook(() => useFeriadosQuery(null), {
			wrapper: createWrapper(),
		})

		expect(result.current.isPending).toBe(true)
		expect(result.current.fetchStatus).toBe("idle")
	})

	test("falha com ApiError quando a BrasilAPI muda o contrato", async () => {
		let requestCount = 0
		server.use(
			http.get("https://brasilapi.com.br/api/feriados/v1/2026", () => {
				requestCount += 1
				return HttpResponse.json([{ date: "2026-01-01", name: "Ano Novo" }])
			}),
		)

		const { result } = renderHook(() => useFeriadosQuery(2026), {
			wrapper: createWrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 3_000,
		})
		expect(result.current.error).toBeInstanceOf(ApiError)
		expect(result.current.error?.code).toBe("holidays_invalid_response")
		expect(requestCount).toBe(1)
	})

	test.each([
		[
			"data fora do formato YYYY-MM-DD",
			{ date: "01/01/2026", name: "Ano Novo", type: "national" },
		],
		[
			"nome vazio após trim",
			{ date: "2026-01-01", name: "   ", type: "national" },
		],
		[
			"tipo fora do contrato nacional",
			{ date: "2026-01-01", name: "Ano Novo", type: "municipal" },
		],
	])("falha quando payload mantém string inválida: %s", async (_case, holiday) => {
		server.use(
			http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
				HttpResponse.json([holiday]),
			),
		)

		const { result } = renderHook(() => useFeriadosQuery(2026), {
			wrapper: createWrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true), {
			timeout: 3_000,
		})
		expect(result.current.error).toBeInstanceOf(ApiError)
		expect(result.current.error?.code).toBe("holidays_invalid_response")
	})

	test("limita request pendurado com timeout app-level", async () => {
		vi.useFakeTimers()
		try {
			server.use(
				http.get("https://brasilapi.com.br/api/feriados/v1/2026", async () => {
					await delay("infinite")
					return HttpResponse.json([])
				}),
			)

			const { result } = renderHook(() => useFeriadosQuery(2026), {
				wrapper: createWrapper(),
			})

			expect(result.current.isPending).toBe(true)

			await act(async () => {
				await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS)
			})
			await act(async () => {
				await vi.advanceTimersByTimeAsync(1_000)
			})
			await act(async () => {
				await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS)
			})
			await act(async () => {
				await vi.waitFor(() => expect(result.current.isError).toBe(true))
			})
			expect(result.current.error).toBeInstanceOf(ApiError)
			expect(result.current.error?.status).toBe(504)
			expect(result.current.error?.code).toBe("holidays_timeout")
		} finally {
			vi.useRealTimers()
		}
	})

	test("propaga abort do TanStack Query para a request em andamento", async () => {
		let requestStartedResolve: () => void = () => undefined
		let abortPromiseResolve: () => void = () => undefined
		const requestStarted = new Promise<void>((resolve) => {
			requestStartedResolve = resolve
		})
		const abortPromise = new Promise<void>((resolve) => {
			abortPromiseResolve = resolve
		})
		server.use(
			http.get(
				"https://brasilapi.com.br/api/feriados/v1/2026",
				async ({ request }) => {
					requestStartedResolve()
					request.signal.addEventListener("abort", abortPromiseResolve, {
						once: true,
					})
					await delay("infinite")
					return HttpResponse.json([])
				},
			),
		)

		const { result, unmount } = renderHook(() => useFeriadosQuery(2026), {
			wrapper: createWrapper(),
		})

		expect(result.current.fetchStatus).toBe("fetching")
		await requestStarted
		unmount()

		await expect(
			Promise.race([
				abortPromise.then(() => "aborted"),
				new Promise((resolve) =>
					globalThis.setTimeout(resolve, 1_000, "pending"),
				),
			]),
		).resolves.toBe("aborted")
	})
})
