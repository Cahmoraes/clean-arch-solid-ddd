import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { renderWithProviders } from "@/test/render"
import { GymResults } from "./gym-results"

const gyms: Gym[] = [
	{
		id: "g1",
		title: "VOLT Centro",
		description: null,
		phone: null,
		address: "Rua A, 100",
		imageKey: null,
		latitude: -23.5,
		longitude: -46.6,
	},
	{
		id: "g2",
		title: "VOLT Sul",
		description: null,
		phone: null,
		address: "Rua B, 200",
		imageKey: null,
		latitude: -23.6,
		longitude: -46.7,
	},
]

function baseProps() {
	return {
		query: "",
		isBrowseMode: true,
		isLoading: false,
		isError: false,
		onRetry: () => {},
		items: gyms,
	}
}

describe("GymResults", () => {
	test("exibe link de edição em cada card quando isAdmin é verdadeiro", () => {
		renderWithProviders(<GymResults {...baseProps()} isAdmin />)
		expect(screen.getByTestId("gym-edit-g1")).toHaveAttribute(
			"href",
			"/admin/academias/g1/editar",
		)
		expect(screen.getByTestId("gym-edit-g2")).toHaveAttribute(
			"href",
			"/admin/academias/g2/editar",
		)
	})

	test("não exibe link de edição quando isAdmin é falso", () => {
		renderWithProviders(<GymResults {...baseProps()} isAdmin={false} />)
		expect(screen.queryByTestId("gym-edit-g1")).not.toBeInTheDocument()
		expect(screen.queryByTestId("gym-edit-g2")).not.toBeInTheDocument()
	})

	test("não exibe link de edição quando isAdmin é omitido", () => {
		renderWithProviders(<GymResults {...baseProps()} />)
		expect(screen.queryByTestId("gym-edit-g1")).not.toBeInTheDocument()
	})
})
