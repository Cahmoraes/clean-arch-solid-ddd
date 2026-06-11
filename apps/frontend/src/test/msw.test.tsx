import { useQuery } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactElement } from "react"
import { describe, expect, it } from "vitest"
import { server } from "./msw/server"
import { renderWithProviders } from "./render"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

interface MeResponse {
	id: string
	name: string
}

function MeProbe(): ReactElement {
	const { data, isPending } = useQuery<MeResponse>({
		queryKey: ["test", "me"],
		queryFn: async () => {
			const response = await fetch(`${apiBaseUrl}/users/me`)
			return response.json() as Promise<MeResponse>
		},
	})
	if (isPending) return <span>loading</span>
	return <span data-testid="name">{data?.name}</span>
}

describe("MSW integration", () => {
	it("intercepts HTTP requests with default handlers", async () => {
		renderWithProviders(<MeProbe />)
		await waitFor(() => {
			expect(screen.getByTestId("name")).toHaveTextContent("Stub User")
		})
	})

	it("allows overriding handlers per-test", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me`, () =>
				HttpResponse.json({ id: "x", name: "Override User" }, { status: 200 }),
			),
		)
		renderWithProviders(<MeProbe />)
		await waitFor(() => {
			expect(screen.getByTestId("name")).toHaveTextContent("Override User")
		})
	})
})
