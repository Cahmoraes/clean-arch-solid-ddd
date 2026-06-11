import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDebounce } from "./use-debounce"

describe("useDebounce", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("retorna o valor inicial imediatamente", () => {
		const { result } = renderHook(() => useDebounce("inicial", 500))
		expect(result.current).toBe("inicial")
	})

	it("não atualiza o valor antes do delay", () => {
		const { result, rerender } = renderHook(
			({ value }) => useDebounce(value, 500),
			{ initialProps: { value: "inicial" } },
		)
		rerender({ value: "novo" })
		act(() => {
			vi.advanceTimersByTime(400)
		})
		expect(result.current).toBe("inicial")
	})

	it("atualiza o valor após o delay", () => {
		const { result, rerender } = renderHook(
			({ value }) => useDebounce(value, 500),
			{ initialProps: { value: "inicial" } },
		)
		rerender({ value: "novo" })
		act(() => {
			vi.advanceTimersByTime(500)
		})
		expect(result.current).toBe("novo")
	})

	it("reinicia o timer quando o valor muda antes do delay expirar", () => {
		const { result, rerender } = renderHook(
			({ value }) => useDebounce(value, 500),
			{ initialProps: { value: "a" } },
		)
		rerender({ value: "b" })
		act(() => {
			vi.advanceTimersByTime(400)
		})
		rerender({ value: "c" })
		act(() => {
			vi.advanceTimersByTime(400)
		})
		expect(result.current).toBe("a")
		act(() => {
			vi.advanceTimersByTime(100)
		})
		expect(result.current).toBe("c")
	})
})
