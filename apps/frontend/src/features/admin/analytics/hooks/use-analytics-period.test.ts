import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const mockReplace = vi.fn()
const mockGet = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	useSearchParams: () => ({ get: mockGet, toString: () => "" }),
	usePathname: () => "/admin/analytics",
}))

import { useAnalyticsPeriod } from "./use-analytics-period"

describe("useAnalyticsPeriod", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGet.mockReturnValue(null)
	})

	test("deve retornar '30d' como período padrão quando não há query param", () => {
		mockGet.mockReturnValue(null)
		const { result } = renderHook(() => useAnalyticsPeriod())
		expect(result.current.period).toBe("30d")
	})

	test("deve retornar o período da URL quando query param está presente", () => {
		mockGet.mockReturnValue("7d")
		const { result } = renderHook(() => useAnalyticsPeriod())
		expect(result.current.period).toBe("7d")
	})

	test("deve atualizar a URL ao chamar setPeriod", () => {
		const { result } = renderHook(() => useAnalyticsPeriod())
		act(() => {
			result.current.setPeriod("12m")
		})
		expect(mockReplace).toHaveBeenCalledWith(
			expect.stringContaining("period=12m"),
		)
	})

	test("deve retornar '30d' para query param inválido", () => {
		mockGet.mockReturnValue("invalid")
		const { result } = renderHook(() => useAnalyticsPeriod())
		expect(result.current.period).toBe("30d")
	})
})
