import { screen } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

const useParamsMock = vi.fn<() => { token: string }>()

vi.mock("next/navigation", () => ({
	useParams: () => useParamsMock(),
}))

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import ActivateAccountPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
const VALID_TOKEN = "550e8400-e29b-41d4-a716-446655440000"

describe("ActivateAccountPage", () => {
	beforeEach(() => {
		useParamsMock.mockReset()
	})

	it("exibe sucesso quando token UUID é aceito pelo backend", async () => {
		useParamsMock.mockReturnValue({ token: VALID_TOKEN })
		server.use(
			http.patch(`${apiBaseUrl}/users/activate`, () =>
				HttpResponse.json({}, { status: 200 }),
			),
		)
		renderWithProviders(<ActivateAccountPage />)
		expect(await screen.findByTestId("activate-success")).toBeInTheDocument()
	})

	it("exibe erro quando token não é UUID válido", async () => {
		useParamsMock.mockReturnValue({ token: "invalid-token" })
		renderWithProviders(<ActivateAccountPage />)
		const error = await screen.findByTestId("activate-error")
		expect(error.textContent).toMatch(/inválid/i)
	})

	it("exibe erro quando backend rejeita ativação", async () => {
		useParamsMock.mockReturnValue({ token: VALID_TOKEN })
		server.use(
			http.patch(`${apiBaseUrl}/users/activate`, () =>
				HttpResponse.json({ message: "bad" }, { status: 400 }),
			),
		)
		renderWithProviders(<ActivateAccountPage />)
		const error = await screen.findByTestId("activate-error")
		expect(error.textContent).toMatch(/inválid|utiliz/i)
	})
})
