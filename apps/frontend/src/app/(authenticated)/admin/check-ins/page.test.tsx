import { render, screen } from "@testing-library/react"
import { useRouter, useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useCheckIns } from "@/features/check-ins/api"
import AdminCheckInsPage from "./page.js"

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}))

vi.mock("@/features/check-ins/api", () => ({
	useCheckIns: vi.fn(),
	CHECK_INS_DEFAULT_PAGE_SIZE: 10,
}))

vi.mock("@/features/check-ins/hooks/use-admin-check-in-stats", () => ({
	useAdminCheckInStats: vi.fn(() => ({ data: undefined })),
}))

const mockQuerySuccess = (items = [], total = 0) => ({
	isLoading: false,
	isError: false,
	isSuccess: true,
	data: { items, total, page: 1 },
	error: null,
	refetch: vi.fn(),
})

describe("AdminCheckInsPage", () => {
	beforeEach(() => {
		vi.mocked(useRouter).mockReturnValue({
			replace: vi.fn(),
		} as unknown as ReturnType<typeof useRouter>)
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("") as unknown as ReturnType<typeof useSearchParams>,
		)
		vi.mocked(useCheckIns).mockReturnValue(
			mockQuerySuccess() as unknown as ReturnType<typeof useCheckIns>,
		)
	})

	it("renders the filter bar with all 4 pills", () => {
		render(<AdminCheckInsPage />)
		expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Pendentes" }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Aprovados" }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Rejeitados" }),
		).toBeInTheDocument()
	})

	it("calls useCheckIns with status from URL params", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=pending&page=2") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		render(<AdminCheckInsPage />)
		expect(vi.mocked(useCheckIns)).toHaveBeenCalledWith(
			expect.objectContaining({ status: "pending", page: 2 }),
		)
	})

	it("calls useCheckIns without status when no filter is active (Todos)", () => {
		render(<AdminCheckInsPage />)
		expect(vi.mocked(useCheckIns)).toHaveBeenCalledWith(
			expect.objectContaining({ status: undefined }),
		)
	})

	it("shows default empty state when no filter is active and list is empty", () => {
		render(<AdminCheckInsPage />)
		expect(screen.getByText("Nenhum check-in encontrado")).toBeInTheDocument()
	})

	it("shows contextual empty state when filter is active and list is empty", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=pending") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		render(<AdminCheckInsPage />)
		expect(
			screen.getByText("Nenhum check-in pendente encontrado"),
		).toBeInTheDocument()
	})

	it("shows contextual empty state for rejected filter", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=rejected") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		render(<AdminCheckInsPage />)
		expect(
			screen.getByText("Nenhum check-in rejeitado encontrado"),
		).toBeInTheDocument()
	})
})
