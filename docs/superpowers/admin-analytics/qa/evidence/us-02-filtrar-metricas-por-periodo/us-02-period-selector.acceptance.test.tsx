/**
 * Acceptance test — US-02: Filtrar métricas por período pré-definido
 *
 * FR-002: Seletor de período com opções 7d, 30d, 3m, 12m; padrão = 30d
 * FR-003: Período persistido na URL como ?period=<valor>
 */

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

// --- mock next/navigation (mesmo padrão do teste unitário existente) ---
const mockReplace = vi.fn()
const mockGet = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	useSearchParams: () => ({ get: mockGet, toString: () => "" }),
	usePathname: () => "/admin/analytics",
}))

import {
	type PeriodKey,
	useAnalyticsPeriod,
} from "@/features/admin/analytics/hooks/use-analytics-period"

// Opções exigidas por FR-002
const REQUIRED_OPTIONS: PeriodKey[] = ["7d", "30d", "3m", "12m"]

describe("US-02 — Filtrar métricas por período", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGet.mockReturnValue(null)
	})

	// FR-002 — padrão ao abrir a página deve ser 30 dias
	test("FR-002: período padrão é '30d' quando não há query param na URL", () => {
		mockGet.mockReturnValue(null)
		const { result } = renderHook(() => useAnalyticsPeriod())
		expect(result.current.period).toBe("30d")
	})

	// FR-002 — todas as 4 opções devem ser valores válidos aceitos pelo hook
	test("FR-002: hook aceita todos os 4 períodos exigidos (7d, 30d, 3m, 12m)", () => {
		for (const option of REQUIRED_OPTIONS) {
			mockGet.mockReturnValue(option)
			const { result } = renderHook(() => useAnalyticsPeriod())
			expect(result.current.period).toBe(option)
		}
	})

	// FR-002 — valor inválido deve retornar ao padrão 30d
	test("FR-002: período inválido na URL retorna ao padrão '30d'", () => {
		mockGet.mockReturnValue("invalid-value")
		const { result } = renderHook(() => useAnalyticsPeriod())
		expect(result.current.period).toBe("30d")
	})

	// FR-003 — período selecionado deve ser gravado em ?period=<valor> na URL
	test("FR-003: setPeriod grava o período selecionado na URL como ?period=<valor>", () => {
		const { result } = renderHook(() => useAnalyticsPeriod())
		for (const option of REQUIRED_OPTIONS) {
			act(() => {
				result.current.setPeriod(option)
			})
			expect(mockReplace).toHaveBeenCalledWith(
				expect.stringContaining(`period=${option}`),
			)
		}
	})

	// FR-003 — link deve ser compartilhável: período lido de volta da URL
	test("FR-003: período lido da URL é retornado corretamente (link compartilhável)", () => {
		mockGet.mockReturnValue("3m")
		const { result } = renderHook(() => useAnalyticsPeriod())
		expect(result.current.period).toBe("3m")
	})
})
