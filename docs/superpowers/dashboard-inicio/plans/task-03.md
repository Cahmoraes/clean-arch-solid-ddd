# Task 3: Dashboard API hook + funções de cálculo de métricas [RF-014, RF-015, RF-016, RF-018, RF-019, RF-026, RF-027]

**Status:** PENDING
**PRD:** `../prd/prd-dashboard-inicio.md`
**Spec:** `../specs/dashboard-inicio-design.md`

## Visão Geral

Criar o hook `useDashboardHistory` que busca múltiplas páginas do histórico de check-ins em paralelo (até 15 páginas = 150 check-ins), e as funções puras de cálculo de métricas: `computeStreak`, `computeThisMonth`, `computeWeeklyFrequency`, `computeHeatmap`, `computeStatusDistribution`. As funções puras são testadas com Vitest sem rendering.

O hook `useDashboardHistory` reutiliza a função interna de fetch de `/check-ins/me` da feature check-ins. `useMe` e `useMetrics` já existem em `features/profile/api` e são reutilizados diretamente pelos componentes do dashboard.

## Arquivos

- Create: `apps/frontend/src/features/dashboard/api/index.ts`
- Create: `apps/frontend/src/features/dashboard/hooks/use-dashboard-metrics.ts`
- Create: `apps/frontend/src/features/dashboard/hooks/use-dashboard-metrics.test.ts`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: `useQuery`, query keys
- vitest: testes unitários de funções puras, sem renderização

## Passos

- [ ] **Step 1: Escrever os testes das funções de cálculo**

```ts
// apps/frontend/src/features/dashboard/hooks/use-dashboard-metrics.test.ts
import { describe, expect, test } from "vitest"
import type { CheckIn } from "@/features/check-ins/api"
import {
	computeHeatmap,
	computeStatusDistribution,
	computeStreak,
	computeThisMonth,
	computeWeeklyFrequency,
} from "./use-dashboard-metrics"

function makeCheckIn(
	overrides: Partial<CheckIn> & { createdAt: string },
): CheckIn {
	return {
		id: "ci-1",
		gymId: "gym-1",
		gymTitle: "Smart Fit",
		userId: "u-1",
		validatedAt: overrides.createdAt,
		rejectedAt: null,
		status: "validated",
		...overrides,
	}
}

const TODAY = new Date()
TODAY.setHours(12, 0, 0, 0)

function daysAgo(n: number): string {
	const d = new Date(TODAY)
	d.setDate(d.getDate() - n)
	return d.toISOString()
}

describe("computeThisMonth", () => {
	test("conta apenas check-ins do mês atual", () => {
		const thisMonth = makeCheckIn({ createdAt: daysAgo(0) })
		const lastMonth = makeCheckIn({
			createdAt: new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 15).toISOString(),
		})
		expect(computeThisMonth([thisMonth, lastMonth])).toBe(1)
	})

	test("retorna 0 para lista vazia", () => {
		expect(computeThisMonth([])).toBe(0)
	})
})

describe("computeStreak", () => {
	test("conta dias consecutivos com check-in validado", () => {
		const checkIns = [
			makeCheckIn({ createdAt: daysAgo(0), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(2), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(4), status: "validated" }), // quebra a sequência
		]
		expect(computeStreak(checkIns)).toBe(3)
	})

	test("ignora check-ins pendentes e rejeitados no streak", () => {
		const checkIns = [
			makeCheckIn({ createdAt: daysAgo(0), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(1), status: "pending" }),
		]
		expect(computeStreak(checkIns)).toBe(1)
	})

	test("retorna 0 para lista vazia", () => {
		expect(computeStreak([])).toBe(0)
	})
})

describe("computeWeeklyFrequency", () => {
	test("agrupa check-ins por dia da semana", () => {
		// Forçar um check-in em segunda-feira (dayOfWeek=1)
		const monday = new Date(TODAY)
		while (monday.getDay() !== 1) {
			monday.setDate(monday.getDate() - 1)
		}
		const checkIns = [
			makeCheckIn({ createdAt: monday.toISOString() }),
			makeCheckIn({ createdAt: monday.toISOString() }),
		]
		const freq = computeWeeklyFrequency(checkIns)
		expect(freq[1]).toBe(2)
		expect(freq.length).toBe(7)
	})

	test("retorna array de zeros para lista vazia", () => {
		expect(computeWeeklyFrequency([])).toEqual([0, 0, 0, 0, 0, 0, 0])
	})
})

describe("computeHeatmap", () => {
	test("retorna 90 dias", () => {
		const result = computeHeatmap([])
		expect(result).toHaveLength(90)
	})

	test("mapeia intensidade corretamente", () => {
		const checkIns = [
			makeCheckIn({ createdAt: daysAgo(0) }),
			makeCheckIn({ createdAt: daysAgo(0) }),
			makeCheckIn({ createdAt: daysAgo(0) }),
			makeCheckIn({ createdAt: daysAgo(0) }),
		]
		const result = computeHeatmap(checkIns)
		const today = result[result.length - 1]
		expect(today.count).toBe(4)
		expect(today.intensity).toBe(4)
	})

	test("dia sem check-in tem intensidade 0", () => {
		const result = computeHeatmap([])
		expect(result[0].intensity).toBe(0)
		expect(result[0].count).toBe(0)
	})
})

describe("computeStatusDistribution", () => {
	test("conta por status", () => {
		const checkIns = [
			makeCheckIn({ createdAt: daysAgo(0), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(1), status: "validated" }),
			makeCheckIn({ createdAt: daysAgo(2), status: "pending" }),
			makeCheckIn({ createdAt: daysAgo(3), status: "rejected" }),
		]
		expect(computeStatusDistribution(checkIns)).toEqual({
			validated: 2,
			pending: 1,
			rejected: 1,
		})
	})

	test("retorna zeros para lista vazia", () => {
		expect(computeStatusDistribution([])).toEqual({
			validated: 0,
			pending: 0,
			rejected: 0,
		})
	})
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose use-dashboard-metrics
```

Esperado: FAIL — o módulo ainda não existe.

- [ ] **Step 3: Implementar as funções de cálculo**

```ts
// apps/frontend/src/features/dashboard/hooks/use-dashboard-metrics.ts
import type { CheckIn } from "@/features/check-ins/api"

export interface HeatmapDay {
	date: string
	count: number
	intensity: 0 | 1 | 2 | 3 | 4
}

export interface StatusDistribution {
	validated: number
	pending: number
	rejected: number
}

function toDateString(iso: string): string {
	return iso.slice(0, 10)
}

export function computeThisMonth(checkIns: CheckIn[]): number {
	const now = new Date()
	const year = now.getFullYear()
	const month = now.getMonth()
	return checkIns.filter((ci) => {
		const d = new Date(ci.createdAt)
		return d.getFullYear() === year && d.getMonth() === month
	}).length
}

export function computeStreak(checkIns: CheckIn[]): number {
	const validatedDays = new Set(
		checkIns
			.filter((ci) => ci.status === "validated")
			.map((ci) => toDateString(ci.createdAt)),
	)

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const todayStr = toDateString(today.toISOString())
	let cursor = validatedDays.has(todayStr)
		? today
		: new Date(today.getTime() - 86_400_000)

	let streak = 0
	while (true) {
		const dateStr = toDateString(cursor.toISOString())
		if (!validatedDays.has(dateStr)) break
		streak++
		cursor = new Date(cursor.getTime() - 86_400_000)
	}
	return streak
}

export function computeWeeklyFrequency(checkIns: CheckIn[]): number[] {
	const freq = [0, 0, 0, 0, 0, 0, 0]
	for (const ci of checkIns) {
		const day = new Date(ci.createdAt).getDay()
		freq[day]++
	}
	return freq
}

function toIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
	if (count === 0) return 0
	if (count === 1) return 1
	if (count === 2) return 2
	if (count === 3) return 3
	return 4
}

export function computeHeatmap(checkIns: CheckIn[]): HeatmapDay[] {
	const countByDate: Record<string, number> = {}
	for (const ci of checkIns) {
		const date = toDateString(ci.createdAt)
		countByDate[date] = (countByDate[date] ?? 0) + 1
	}

	const days: HeatmapDay[] = []
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	for (let i = 89; i >= 0; i--) {
		const d = new Date(today.getTime() - i * 86_400_000)
		const date = toDateString(d.toISOString())
		const count = countByDate[date] ?? 0
		days.push({ date, count, intensity: toIntensity(count) })
	}
	return days
}

export function computeStatusDistribution(
	checkIns: CheckIn[],
): StatusDistribution {
	let validated = 0
	let pending = 0
	let rejected = 0
	for (const ci of checkIns) {
		if (ci.status === "validated") validated++
		else if (ci.status === "pending") pending++
		else rejected++
	}
	return { validated, pending, rejected }
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose use-dashboard-metrics
```

Esperado: PASS — todos os testes passam.

- [ ] **Step 5: Criar o hook de fetch do histórico**

```ts
// apps/frontend/src/features/dashboard/api/index.ts
"use client"

import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import type { CheckIn } from "@/features/check-ins/api"
import { getCheckInsExtendedClient } from "@/features/check-ins/api/extended-paths"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const dashboardKeys = {
	history: () => ["dashboard", "history"] as const,
}

const MAX_HISTORY_PAGES = 15
const PAGE_SIZE = 10 // backend default

async function fetchDashboardHistory(): Promise<CheckIn[]> {
	const client = getCheckInsExtendedClient()

	const { data: first, error } = await client.GET("/check-ins/me", {
		params: { query: { page: 1 } },
	})
	if (error || !first) throw toApiError(error)

	const totalPages = Math.min(
		Math.ceil(first.total / PAGE_SIZE),
		MAX_HISTORY_PAGES,
	)

	if (totalPages <= 1) return first.items

	const remainingPages = Array.from(
		{ length: totalPages - 1 },
		(_, i) => i + 2,
	)

	const remainingResults = await Promise.all(
		remainingPages.map((page) =>
			client
				.GET("/check-ins/me", { params: { query: { page } } })
				.then(({ data, error: e }) => {
					if (e || !data) throw toApiError(e)
					return data.items
				}),
		),
	)

	return [...first.items, ...remainingResults.flat()]
}

export function useDashboardHistory(): UseQueryResult<CheckIn[], ApiError> {
	return useQuery<CheckIn[], ApiError>({
		queryKey: dashboardKeys.history(),
		queryFn: fetchDashboardHistory,
		staleTime: 60_000,
	})
}
```

- [ ] **Step 6: Lint e type-check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/features/dashboard/
git commit -m "feat(frontend): add dashboard API hook and metrics computation functions"
```

## Critérios de Sucesso

- Todos os 11 testes de `use-dashboard-metrics.test.ts` passam [RF-014, RF-015, RF-018, RF-026]
- `useDashboardHistory` busca múltiplas páginas em paralelo com máximo de 15 [RF-016, RF-019, RF-027]
- Funções exportadas: `computeStreak`, `computeThisMonth`, `computeWeeklyFrequency`, `computeHeatmap`, `computeStatusDistribution`
- `pnpm lint:fix` e `pnpm tsc:check` sem erros
