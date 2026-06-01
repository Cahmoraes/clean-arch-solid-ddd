import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const mockReplace = vi.fn()
let mockSearchParamsString = ""

vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(mockSearchParamsString),
	useRouter: () => ({ replace: mockReplace }),
}))

import { useCheckInFilters } from "./use-check-in-filters"

describe("useCheckInFilters", () => {
	beforeEach(() => {
		mockSearchParamsString = ""
		mockReplace.mockClear()
	})

	test("retorna gymName vazio por padrão", () => {
		const { result } = renderHook(() => useCheckInFilters())
		expect(result.current.gymName).toBe("")
	})

	test("retorna sortOrder desc por padrão", () => {
		const { result } = renderHook(() => useCheckInFilters())
		expect(result.current.sortOrder).toBe("desc")
	})

	test("lê gymName da URL", () => {
		mockSearchParamsString = "gymName=smartfit"
		const { result } = renderHook(() => useCheckInFilters())
		expect(result.current.gymName).toBe("smartfit")
	})

	test("lê sortOrder da URL", () => {
		mockSearchParamsString = "sortOrder=asc"
		const { result } = renderHook(() => useCheckInFilters())
		expect(result.current.sortOrder).toBe("asc")
	})

	test("setGymName atualiza a URL com gymName e reseta page para 1", () => {
		mockSearchParamsString = "page=3&status=pending"
		const { result } = renderHook(() => useCheckInFilters())
		act(() => {
			result.current.setGymName("smartfit")
		})
		const calledWith = mockReplace.mock.calls[0][0] as string
		const params = new URLSearchParams(calledWith.replace("?", ""))
		expect(params.get("gymName")).toBe("smartfit")
		expect(params.get("page")).toBe("1")
		expect(params.get("status")).toBe("pending")
	})

	test("setGymName remove gymName da URL quando string vazia", () => {
		mockSearchParamsString = "gymName=smartfit"
		const { result } = renderHook(() => useCheckInFilters())
		act(() => {
			result.current.setGymName("")
		})
		const calledWith = mockReplace.mock.calls[0][0] as string
		const params = new URLSearchParams(calledWith.replace("?", ""))
		expect(params.has("gymName")).toBe(false)
	})

	test("setSortOrder atualiza a URL com sortOrder e reseta page para 1", () => {
		mockSearchParamsString = "page=2"
		const { result } = renderHook(() => useCheckInFilters())
		act(() => {
			result.current.setSortOrder("asc")
		})
		const calledWith = mockReplace.mock.calls[0][0] as string
		const params = new URLSearchParams(calledWith.replace("?", ""))
		expect(params.get("sortOrder")).toBe("asc")
		expect(params.get("page")).toBe("1")
	})
})
