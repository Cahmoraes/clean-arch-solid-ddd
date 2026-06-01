import { render, screen } from "@testing-library/react"
import { useRouter, useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMyCheckIns } from "@/features/check-ins/api"
import CheckInsPage from "./page.js"

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}))

vi.mock("@/features/check-ins/api", () => ({
	useMyCheckIns: vi.fn(),
	CHECK_INS_DEFAULT_PAGE_SIZE: 10,
}))

vi.mock("@/features/check-ins/hooks/use-my-check-in-stats", () => ({
	useMyCheckInStats: vi.fn(() => ({ data: undefined })),
}))

const mockQuerySuccess = (items = [], total = 0) => ({
	isLoading: false,
	isError: false,
	isSuccess: true,
	data: { items, total, page: 1 },
	error: null,
	refetch: vi.fn(),
})

describe("CheckInsPage", () => {
	beforeEach(() => {
		vi.mocked(useRouter).mockReturnValue({
			replace: vi.fn(),
		} as unknown as ReturnType<typeof useRouter>)
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("") as unknown as ReturnType<typeof useSearchParams>,
		)
		vi.mocked(useMyCheckIns).mockReturnValue(
			mockQuerySuccess() as unknown as ReturnType<typeof useMyCheckIns>,
		)
	})

	it("renders the filter bar with all 4 pills", () => {
		render(<CheckInsPage />)
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

	it("calls useMyCheckIns with status from URL params", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=pending&page=2") as ReturnType<
				typeof useSearchParams
			>,
		)
		render(<CheckInsPage />)
		expect(vi.mocked(useMyCheckIns)).toHaveBeenCalledWith(
			expect.objectContaining({ status: "pending", page: 2 }),
		)
	})

	it("shows default empty state when no filter is active and list is empty", () => {
		render(<CheckInsPage />)
		expect(screen.getByText("Você ainda não fez check-in")).toBeInTheDocument()
	})

	it("shows contextual empty state when filter is active and list is empty", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=pending") as ReturnType<
				typeof useSearchParams
			>,
		)
		render(<CheckInsPage />)
		expect(
			screen.getByText("Nenhum check-in pendente encontrado"),
		).toBeInTheDocument()
	})

	it("shows contextual empty state for validated filter", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=validated") as ReturnType<
				typeof useSearchParams
			>,
		)
		render(<CheckInsPage />)
		expect(
			screen.getByText("Nenhum check-in aprovado encontrado"),
		).toBeInTheDocument()
	})

	it("shows contextual empty state for rejected filter", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=rejected") as ReturnType<
				typeof useSearchParams
			>,
		)
		render(<CheckInsPage />)
		expect(
			screen.getByText("Nenhum check-in rejeitado encontrado"),
		).toBeInTheDocument()
	})
})
