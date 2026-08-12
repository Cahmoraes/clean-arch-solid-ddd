import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useWeatherQuery } from "./use-weather-query"

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

describe("useWeatherQuery", () => {
	test("retorna o clima para uma cidade válida", async () => {
		server.use(
			http.get(`${apiBaseUrl}/weather`, () =>
				HttpResponse.json(
					{
						city: "São Paulo",
						temperature: { current: 24, min: 18, max: 27 },
					},
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useWeatherQuery("São Paulo"), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual({
			city: "São Paulo",
			temperature: { current: 24, min: 18, max: 27 },
		})
	})

	test("expõe ApiError com code city_not_found quando o endpoint retorna 404", async () => {
		server.use(
			http.get(`${apiBaseUrl}/weather`, () =>
				HttpResponse.json(
					{ code: "city_not_found", message: "City not found" },
					{ status: 404 },
				),
			),
		)

		const { result } = renderHook(() => useWeatherQuery("Atlantis"), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error?.code).toBe("city_not_found")
	})

	test("expõe ApiError com code weather_provider_unavailable quando o endpoint retorna 503", async () => {
		server.use(
			http.get(`${apiBaseUrl}/weather`, () =>
				HttpResponse.json(
					{
						code: "weather_provider_unavailable",
						message: "Weather provider unavailable",
					},
					{ status: 503 },
				),
			),
		)

		const { result } = renderHook(() => useWeatherQuery("São Paulo"), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error?.code).toBe("weather_provider_unavailable")
	})

	test("não dispara a consulta quando city é null", () => {
		const { result } = renderHook(() => useWeatherQuery(null), {
			wrapper: wrapper(),
		})

		expect(result.current.fetchStatus).toBe("idle")
	})
})
