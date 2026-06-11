/**
 * Acceptance test — US-01: KPI row (check-ins, retenção, novos membros)
 * Requisitos cobertos: FR-004, FR-005, FR-006
 *
 * Estratégia: vi.mock nos três hooks para controlar isPending / isError / data
 * sem depender de rede ou MSW handlers.
 */
import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

// ---------------------------------------------------------------------------
// Mocks dos três hooks de KPI (devem ser hoisted antes dos imports do SUT)
// ---------------------------------------------------------------------------

const mockCheckIn = vi.fn()
const mockRetention = vi.fn()
const mockGrowth = vi.fn()

vi.mock(
  "@/features/admin/analytics/api/use-check-in-metrics",
  () => ({ useCheckInMetrics: (...args: unknown[]) => mockCheckIn(...args) }),
)

vi.mock(
  "@/features/admin/analytics/api/use-retention-metrics",
  () => ({ useRetentionMetrics: (...args: unknown[]) => mockRetention(...args) }),
)

vi.mock(
  "@/features/admin/analytics/api/use-growth-metrics",
  () => ({ useGrowthMetrics: (...args: unknown[]) => mockGrowth(...args) }),
)

// SUT importado DEPOIS dos mocks (vitest hoisting garante isso em runtime)
import { AnalyticsKpiRow } from "@/features/admin/analytics/components/analytics-kpi-row"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pendingState() {
  return { isPending: true, isError: false, isSuccess: false, data: undefined }
}

function errorState() {
  return { isPending: false, isError: true, isSuccess: false, data: undefined, error: new Error("fail") }
}

function checkInSuccess(totalCheckIns = 120) {
  return {
    isPending: false,
    isError: false,
    isSuccess: true,
    data: { totalCheckIns, dailySeries: [] },
  }
}

function retentionSuccess(churnRate = 20) {
  return {
    isPending: false,
    isError: false,
    isSuccess: true,
    data: { churnRate, retentionRate: 100 - churnRate },
  }
}

function growthSuccess(newMembersCount = 5) {
  return {
    isPending: false,
    isError: false,
    isSuccess: true,
    data: { newMembersCount, activeMembersTrend: [], newMembersPerPeriod: [] },
  }
}

// ---------------------------------------------------------------------------
// FR-004 — KPI row exibe 3 cards com dados corretos
// ---------------------------------------------------------------------------
describe("FR-004 — AnalyticsKpiRow renderiza 3 KPI cards com dados", () => {
  test("exibe total de check-ins no período", () => {
    mockCheckIn.mockReturnValue(checkInSuccess(42))
    mockRetention.mockReturnValue(retentionSuccess(15))
    mockGrowth.mockReturnValue(growthSuccess(7))

    renderWithProviders(<AnalyticsKpiRow period="30d" />)

    expect(screen.getByText("Check-ins no período")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  test("exibe taxa de retenção em percentual (100 - churnRate)", () => {
    mockCheckIn.mockReturnValue(checkInSuccess(10))
    mockRetention.mockReturnValue(retentionSuccess(20)) // retenção = 80%
    mockGrowth.mockReturnValue(growthSuccess(3))

    renderWithProviders(<AnalyticsKpiRow period="30d" />)

    expect(screen.getByText("Taxa de retenção")).toBeInTheDocument()
    expect(screen.getByText("80.0%")).toBeInTheDocument()
  })

  test("exibe número de novos membros", () => {
    mockCheckIn.mockReturnValue(checkInSuccess(10))
    mockRetention.mockReturnValue(retentionSuccess(10))
    mockGrowth.mockReturnValue(growthSuccess(99))

    renderWithProviders(<AnalyticsKpiRow period="30d" />)

    expect(screen.getByText("Novos membros")).toBeInTheDocument()
    expect(screen.getByText("99")).toBeInTheDocument()
  })

  test("passa o período correto para cada hook", () => {
    mockCheckIn.mockReturnValue(checkInSuccess())
    mockRetention.mockReturnValue(retentionSuccess())
    mockGrowth.mockReturnValue(growthSuccess())

    renderWithProviders(<AnalyticsKpiRow period="7d" />)

    expect(mockCheckIn).toHaveBeenCalledWith("7d")
    expect(mockRetention).toHaveBeenCalledWith("7d")
    expect(mockGrowth).toHaveBeenCalledWith("7d")
  })
})

// ---------------------------------------------------------------------------
// FR-005 — Estado de loading mostra skeleton (não bloqueia outros cards)
// ---------------------------------------------------------------------------
describe("FR-005 — KPI cards exibem loading skeleton individualmente", () => {
  test("check-in em loading → não exibe label 'Check-ins no período'", () => {
    mockCheckIn.mockReturnValue(pendingState())
    mockRetention.mockReturnValue(retentionSuccess())
    mockGrowth.mockReturnValue(growthSuccess())

    renderWithProviders(<AnalyticsKpiRow period="30d" />)

    expect(screen.queryByText("Check-ins no período")).not.toBeInTheDocument()
    // outros cards ainda aparecem
    expect(screen.getByText("Taxa de retenção")).toBeInTheDocument()
    expect(screen.getByText("Novos membros")).toBeInTheDocument()
  })

  test("todos em loading → nenhum label de card visível", () => {
    mockCheckIn.mockReturnValue(pendingState())
    mockRetention.mockReturnValue(pendingState())
    mockGrowth.mockReturnValue(pendingState())

    renderWithProviders(<AnalyticsKpiRow period="30d" />)

    expect(screen.queryByText("Check-ins no período")).not.toBeInTheDocument()
    expect(screen.queryByText("Taxa de retenção")).not.toBeInTheDocument()
    expect(screen.queryByText("Novos membros")).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// FR-006 — Erro em card individual não bloqueia os demais
// ---------------------------------------------------------------------------
describe("FR-006 — Erro por card não bloqueia os outros", () => {
  test("erro só no check-in → mensagem de erro check-in, outros cards OK", () => {
    mockCheckIn.mockReturnValue(errorState())
    mockRetention.mockReturnValue(retentionSuccess(10))
    mockGrowth.mockReturnValue(growthSuccess(3))

    renderWithProviders(<AnalyticsKpiRow period="30d" />)

    expect(screen.getByText("Erro ao carregar check-ins")).toBeInTheDocument()
    expect(screen.queryByText("Check-ins no período")).not.toBeInTheDocument()
    // demais cards não afetados
    expect(screen.getByText("Taxa de retenção")).toBeInTheDocument()
    expect(screen.getByText("Novos membros")).toBeInTheDocument()
  })

  test("erro só na retenção → mensagem de erro retenção, outros cards OK", () => {
    mockCheckIn.mockReturnValue(checkInSuccess(5))
    mockRetention.mockReturnValue(errorState())
    mockGrowth.mockReturnValue(growthSuccess(2))

    renderWithProviders(<AnalyticsKpiRow period="30d" />)

    expect(screen.getByText("Erro ao carregar retenção")).toBeInTheDocument()
    expect(screen.getByText("Check-ins no período")).toBeInTheDocument()
    expect(screen.getByText("Novos membros")).toBeInTheDocument()
  })

  test("erro só no crescimento → mensagem de erro crescimento, outros cards OK", () => {
    mockCheckIn.mockReturnValue(checkInSuccess(5))
    mockRetention.mockReturnValue(retentionSuccess(5))
    mockGrowth.mockReturnValue(errorState())

    renderWithProviders(<AnalyticsKpiRow period="30d" />)

    expect(screen.getByText("Erro ao carregar crescimento")).toBeInTheDocument()
    expect(screen.getByText("Check-ins no período")).toBeInTheDocument()
    expect(screen.getByText("Taxa de retenção")).toBeInTheDocument()
  })

  test("todos em erro → todas as mensagens de erro visíveis simultaneamente", () => {
    mockCheckIn.mockReturnValue(errorState())
    mockRetention.mockReturnValue(errorState())
    mockGrowth.mockReturnValue(errorState())

    renderWithProviders(<AnalyticsKpiRow period="30d" />)

    expect(screen.getByText("Erro ao carregar check-ins")).toBeInTheDocument()
    expect(screen.getByText("Erro ao carregar retenção")).toBeInTheDocument()
    expect(screen.getByText("Erro ao carregar crescimento")).toBeInTheDocument()
  })
})
