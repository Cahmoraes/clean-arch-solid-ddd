import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { useCreateGym, useGymById, useGymsByName } from "./index"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return { Wrapper, queryClient }
}

describe("useGymsByName", () => {
	it("desabilita query quando name é vazio", () => {
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useGymsByName({ name: "", page: 1 }), {
			wrapper: Wrapper,
		})
		expect(result.current.fetchStatus).toBe("idle")
	})

	it("retorna lista de academias do MSW para nome válido", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/search/:name`, () =>
				HttpResponse.json(
					[
						{
							id: "gym-1",
							title: "Iron Gym",
							description: null,
							phone: null,
							latitude: -23.5,
							longitude: -46.6,
						},
					],
					{ status: 200 },
				),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(
			() => useGymsByName({ name: "Iron", page: 1 }),
			{ wrapper: Wrapper },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toHaveLength(1)
		expect(result.current.data?.[0]?.title).toBe("Iron Gym")
	})

	it("trata 404 (no gyms found) como lista vazia, sem erro", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/search/:name`, () =>
				HttpResponse.json({ message: "no gyms" }, { status: 404 }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(
			() => useGymsByName({ name: "Inexistente", page: 1 }),
			{ wrapper: Wrapper },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual([])
	})
})

describe("useGymById", () => {
	it("retorna detalhes da academia do MSW", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, ({ params }) =>
				HttpResponse.json(
					{
						id: String(params.id),
						title: "Iron Gym",
						description: "Top gym",
						phone: "11999",
						latitude: -23.5,
						longitude: -46.6,
					},
					{ status: 200 },
				),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useGymById("gym-42"), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.id).toBe("gym-42")
		expect(result.current.data?.title).toBe("Iron Gym")
	})

	it("desabilita query quando id é undefined", () => {
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useGymById(undefined), {
			wrapper: Wrapper,
		})
		expect(result.current.fetchStatus).toBe("idle")
	})
})

describe("useCreateGym", () => {
	it("envia payload e retorna id após sucesso", async () => {
		server.use(
			http.post(`${apiBaseUrl}/gyms`, () =>
				HttpResponse.json(
					{ message: "Gym created", id: "new-gym-id" },
					{ status: 201 },
				),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useCreateGym(), { wrapper: Wrapper })
		const created = await result.current.mutateAsync({
			title: "Iron Gym",
			cnpj: "12345678000100",
			description: "ok",
			phone: "11999999999",
			latitude: -23.5,
			longitude: -46.6,
		})
		expect(created.id).toBe("new-gym-id")
	})

	it("propaga ApiError quando backend retorna 409", async () => {
		server.use(
			http.post(`${apiBaseUrl}/gyms`, () =>
				HttpResponse.json({ message: "duplicated" }, { status: 409 }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useCreateGym(), { wrapper: Wrapper })
		await expect(
			result.current.mutateAsync({
				title: "Iron Gym",
				cnpj: "12345678000100",
				description: "",
				phone: "",
				latitude: -23.5,
				longitude: -46.6,
			}),
		).rejects.toMatchObject({ status: 409 })
	})
})
