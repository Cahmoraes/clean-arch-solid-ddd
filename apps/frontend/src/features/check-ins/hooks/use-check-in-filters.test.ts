import { act, renderHook } from "@testing-library/react"
import { useRouter, useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useCheckInFilters } from "./use-check-in-filters.js"

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
}))

describe("useCheckInFilters", () => {
	const mockReplace = vi.fn()

	beforeEach(() => {
		vi.mocked(useRouter).mockReturnValue({
			replace: mockReplace,
		} as unknown as ReturnType<typeof useRouter>)
		mockReplace.mockReset()
	})

	it("returns undefined status and page 1 when URL has no params", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("") as ReturnType<typeof useSearchParams>,
		)
		const { result } = renderHook(() => useCheckInFilters())
		expect(result.current.status).toBeUndefined()
		expect(result.current.page).toBe(1)
	})

	it("parses valid status from URL", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=pending") as ReturnType<
				typeof useSearchParams
			>,
		)
		const { result } = renderHook(() => useCheckInFilters())
		expect(result.current.status).toBe("pending")
	})

	it("parses page from URL", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("page=3") as ReturnType<typeof useSearchParams>,
		)
		const { result } = renderHook(() => useCheckInFilters())
		expect(result.current.page).toBe(3)
	})

	it("ignores invalid status values and returns undefined", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=invalid") as ReturnType<
				typeof useSearchParams
			>,
		)
		const { result } = renderHook(() => useCheckInFilters())
		expect(result.current.status).toBeUndefined()
	})

	it("ignores invalid page values and returns 1", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("page=abc") as ReturnType<typeof useSearchParams>,
		)
		const { result } = renderHook(() => useCheckInFilters())
		expect(result.current.page).toBe(1)
	})

	it("setStatus updates URL with new status and resets page to 1", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("page=3") as ReturnType<typeof useSearchParams>,
		)
		const { result } = renderHook(() => useCheckInFilters())
		act(() => {
			result.current.setStatus("pending")
		})
		expect(mockReplace).toHaveBeenCalledWith("?page=1&status=pending")
	})

	it("setStatus with undefined removes status param and resets page to 1", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=pending&page=2") as ReturnType<
				typeof useSearchParams
			>,
		)
		const { result } = renderHook(() => useCheckInFilters())
		act(() => {
			result.current.setStatus(undefined)
		})
		expect(mockReplace).toHaveBeenCalledWith("?page=1")
	})

	it("setPage updates page param and preserves status", () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("status=pending&page=1") as ReturnType<
				typeof useSearchParams
			>,
		)
		const { result } = renderHook(() => useCheckInFilters())
		act(() => {
			result.current.setPage(2)
		})
		expect(mockReplace).toHaveBeenCalledWith("?status=pending&page=2")
	})
})
