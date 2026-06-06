import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import {
	useAllGyms,
	useCreateGym,
	useGymById,
	useGymsByName,
	useSetGymImage,
	useUpdateGym,
} from "./index"

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

describe("useAllGyms", () => {
	it("retorna lista de academias do MSW", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms`, () =>
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
		const { result } = renderHook(() => useAllGyms({ page: 1 }), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toHaveLength(1)
		expect(result.current.data?.[0]?.title).toBe("Iron Gym")
	})

	it("desabilita query quando enabled é false", () => {
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(
			() => useAllGyms({ page: 1, enabled: false }),
			{
				wrapper: Wrapper,
			},
		)
		expect(result.current.fetchStatus).toBe("idle")
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
			location: {
				address: "Av. Paulista, 1578, São Paulo - SP",
				latitude: -23.5,
				longitude: -46.6,
			},
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
				location: {
					address: "Av. Paulista, 1578, São Paulo - SP",
					latitude: -23.5,
					longitude: -46.6,
				},
			}),
		).rejects.toMatchObject({ status: 409 })
	})
})

const validUpdateInput = {
	title: "Academia Editada",
	cnpj: "11222333000181",
	description: "",
	phone: "",
	location: { address: "Rua B, 2", latitude: -23.5, longitude: -46.6 },
}

describe("useUpdateGym", () => {
	it("atualiza a academia via PUT e retorna o id", async () => {
		server.use(
			http.put(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json({ message: "Gym updated", id: "gym-1" }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useUpdateGym(), { wrapper: Wrapper })
		result.current.mutate({ id: "gym-1", input: validUpdateInput })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.id).toBe("gym-1")
	})
})

describe("useSetGymImage", () => {
	it("envia a imagem via POST e retorna imageKey + url", async () => {
		server.use(
			http.post(`${apiBaseUrl}/gyms/:id/image`, () =>
				HttpResponse.json({
					imageKey: "gyms/x.webp",
					url: "/uploads/gyms/x.webp",
				}),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useSetGymImage(), { wrapper: Wrapper })
		result.current.mutate({
			id: "gym-1",
			file: new Blob(["webp"], { type: "image/webp" }),
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.imageKey).toBe("gyms/x.webp")
	})
})
