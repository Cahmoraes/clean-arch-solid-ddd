import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

vi.mock("@/features/profile/api", () => ({
	useMe: () => ({
		data: {
			id: "u1",
			name: "Caique Moraes",
			email: "caique@volt.dev",
			role: "MEMBER",
			hasPassword: true,
			authMethods: ["password"],
			createdAt: "2024-01-15T10:30:00.000Z",
			status: "activated",
		},
		isLoading: false,
		isError: false,
		isFetching: false,
		refetch: vi.fn(),
	}),
	useMetrics: () => ({
		data: { checkInsCount: 12 },
		isLoading: false,
		isError: false,
		isFetching: false,
		refetch: vi.fn(),
	}),
	useUpdateProfile: () => ({ mutate: vi.fn(), isPending: false }),
}))

import ProfilePage from "./page"

describe("Perfil VOLT", () => {
	test("exibe nome e avatar do usuário", () => {
		renderWithProviders(<ProfilePage />)
		expect(screen.getByText("Caique Moraes")).toBeInTheDocument()
		expect(screen.getByText("CM")).toBeInTheDocument()
	})

	test("exibe a métrica de check-ins", () => {
		renderWithProviders(<ProfilePage />)
		expect(screen.getAllByText("12").length).toBeGreaterThan(0)
	})

	test("preserva o botão de editar perfil", () => {
		renderWithProviders(<ProfilePage />)
		expect(screen.getByTestId("profile-edit-button")).toBeInTheDocument()
	})
})
