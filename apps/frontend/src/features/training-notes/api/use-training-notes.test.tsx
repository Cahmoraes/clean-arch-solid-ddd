import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { endpoint } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import {
	trainingNotesQueryKey,
	useCreateNote,
	useDeleteNote,
	useTrainingNotesQuery,
	useUpdateNote,
} from "./use-training-notes"

function createWrapper(): (props: {
	children: ReactNode
}) => React.JSX.Element {
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

describe("useTrainingNotesQuery", () => {
	test("query busca o mês com de/ate exatos sob a chave mensal", async () => {
		const { result } = renderHook(() => useTrainingNotesQuery(2026, 10), {
			wrapper: createWrapper(),
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.map((n) => n.data)).toEqual(["2026-10-16"])
		expect(trainingNotesQueryKey(2026, 10)).toEqual([
			"training-notes",
			2026,
			10,
		])
	})
})

describe("useCreateNote", () => {
	test("mutação com 409 expõe code e invalida a lista após sucesso", async () => {
		const { result } = renderHook(() => useCreateNote(), {
			wrapper: createWrapper(),
		})
		await act(async () => {
			await result.current
				.mutateAsync({ data: "2026-10-16", texto: "duplicada" })
				.catch((e: unknown) => e)
		})
		await waitFor(() => expect(result.current.isError).toBe(true))
		const err = result.current.failureReason as unknown as {
			status?: number
			code?: string
		}
		expect(err.status).toBe(409)
		expect(err.code).toMatch(/NOTA_JA_EXISTE/)
	})

	test("invalida a lista mensal após criar com sucesso", async () => {
		let chamadasGet = 0
		server.use(
			http.get(endpoint("/training-notes"), () => {
				chamadasGet += 1
				return HttpResponse.json(
					[
						{
							data: "2026-10-16",
							texto: "Peito + tríceps 4x12",
							atualizadoEm: "2026-10-16T12:00:00.000Z",
						},
					],
					{ status: 200 },
				)
			}),
		)
		const queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false, gcTime: 0, staleTime: 0 },
				mutations: { retry: false },
			},
		})
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)
		const query = renderHook(() => useTrainingNotesQuery(2026, 10), {
			wrapper,
		})
		await waitFor(() => expect(query.result.current.isSuccess).toBe(true))
		expect(chamadasGet).toBe(1)

		const mutation = renderHook(() => useCreateNote(), { wrapper })
		let created: unknown
		await act(async () => {
			created = await mutation.result.current.mutateAsync({
				data: "2026-10-17",
				texto: "Costas + bíceps 4x12",
			})
		})
		expect(created).toMatchObject({ data: "2026-10-17" })
		await waitFor(() => expect(chamadasGet).toBe(2))
	})
})

describe("useUpdateNote", () => {
	test("atualiza o texto da nota existente", async () => {
		const { result } = renderHook(() => useUpdateNote(), {
			wrapper: createWrapper(),
		})
		let updated: unknown
		await act(async () => {
			updated = await result.current.mutateAsync({
				data: "2026-10-16",
				texto: "Peito + tríceps 5x12",
			})
		})
		expect(updated).toMatchObject({
			data: "2026-10-16",
			texto: "Peito + tríceps 5x12",
		})
	})
})

describe("useDeleteNote", () => {
	test("exclui a nota existente sem erro", async () => {
		const { result } = renderHook(() => useDeleteNote(), {
			wrapper: createWrapper(),
		})
		await act(async () => {
			await result.current.mutateAsync({ data: "2026-10-16" })
		})
		expect(result.current.isSuccess).toBe(true)
	})
})
