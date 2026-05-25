/**
 * Acceptance tests for US-06 — Últimos check-ins
 *
 * Verifies:
 * - RF-022: gymTitle, formatRelativeDate, max 5 items
 * - RF-023: badge com cor semântica (verde/amarelo/vermelho)
 * - RF-024: link "Ver todos" apontando para /check-ins
 * - RF-025: empty state "Nenhum check-in registrado ainda."
 */
import { render, screen } from "@testing-library/react"
import { describe, test, expect, vi, beforeEach } from "vitest"
import React from "react"

// Mock next/link
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string
		children: React.ReactNode
		[key: string]: unknown
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}))

// Mock @/components/ui/skeleton
vi.mock("@/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}))

// Mock @/lib/cn
vi.mock("@/lib/cn", () => ({
	cn: (...classes: (string | undefined | false | null)[]) =>
		classes.filter(Boolean).join(" "),
}))

import { CheckinsTimeline } from "@/features/dashboard/components/checkins-timeline"
import type { CheckIn } from "@/features/check-ins/api"

function makeCheckIn(
	overrides: Partial<CheckIn> & { id: string },
): CheckIn {
	return {
		gymId: "gym-1",
		gymTitle: "Academia Fit",
		userId: "user-1",
		validatedAt: null,
		rejectedAt: null,
		status: "pending",
		createdAt: new Date().toISOString(),
		...overrides,
	}
}

describe("US-06 — CheckinsTimeline", () => {
	describe("RF-025: empty state", () => {
		test("deve exibir mensagem orientativa quando não há check-ins", () => {
			render(<CheckinsTimeline checkIns={[]} />)

			expect(
				screen.getByText("Nenhum check-in registrado ainda."),
			).toBeDefined()
		})
	})

	describe("RF-022: nome da academia, data relativa e máximo de 5 itens", () => {
		test("deve exibir o nome da academia de cada check-in", () => {
			const checkIns = [
				makeCheckIn({ id: "1", gymTitle: "Academia Alpha" }),
				makeCheckIn({ id: "2", gymTitle: "Academia Beta" }),
			]
			render(<CheckinsTimeline checkIns={checkIns} />)

			expect(screen.getByText("Academia Alpha")).toBeDefined()
			expect(screen.getByText("Academia Beta")).toBeDefined()
		})

		test("deve exibir 'Academia' como fallback quando gymTitle é nulo", () => {
			const checkIns = [makeCheckIn({ id: "1", gymTitle: null })]
			render(<CheckinsTimeline checkIns={checkIns} />)

			expect(screen.getByText("Academia")).toBeDefined()
		})

		test("deve exibir no máximo 5 check-ins quando fornecidos 6 ou mais", () => {
			const checkIns = Array.from({ length: 6 }, (_, i) =>
				makeCheckIn({ id: String(i + 1), gymTitle: `Academia ${i + 1}` }),
			)
			render(<CheckinsTimeline checkIns={checkIns} />)

			// Deve mostrar apenas as 5 primeiras academias
			expect(screen.getByText("Academia 1")).toBeDefined()
			expect(screen.getByText("Academia 5")).toBeDefined()
			expect(screen.queryByText("Academia 6")).toBeNull()
		})

		test("deve exibir data relativa 'Hoje' para check-ins de hoje", () => {
			const todayIso = new Date().toISOString()
			const checkIns = [makeCheckIn({ id: "1", createdAt: todayIso })]
			render(<CheckinsTimeline checkIns={checkIns} />)

			// A data relativa deve conter "Hoje"
			const dateElements = screen.getAllByText(/Hoje/i)
			expect(dateElements.length).toBeGreaterThan(0)
		})
	})

	describe("RF-023: badge com cor semântica", () => {
		test("deve exibir badge verde para check-in validado", () => {
			const checkIns = [
				makeCheckIn({ id: "1", status: "validated", gymTitle: "Academia" }),
			]
			render(<CheckinsTimeline checkIns={checkIns} />)

			const badge = screen.getByText("Validado")
			expect(badge.className).toContain("green")
		})

		test("deve exibir badge amarelo para check-in pendente", () => {
			const checkIns = [
				makeCheckIn({ id: "1", status: "pending", gymTitle: "Academia" }),
			]
			render(<CheckinsTimeline checkIns={checkIns} />)

			const badge = screen.getByText("Pendente")
			expect(badge.className).toContain("yellow")
		})

		test("deve exibir badge vermelho para check-in rejeitado", () => {
			const checkIns = [
				makeCheckIn({ id: "1", status: "rejected", gymTitle: "Academia" }),
			]
			render(<CheckinsTimeline checkIns={checkIns} />)

			const badge = screen.getByText("Rejeitado")
			expect(badge.className).toContain("red")
		})
	})

	describe("RF-024: link 'Ver todos' para /check-ins", () => {
		test("deve exibir link 'Ver todos' apontando para /check-ins", () => {
			render(<CheckinsTimeline checkIns={[]} />)

			const link = screen.getByRole("link", { name: /ver todos/i })
			expect(link).toBeDefined()
			expect(link.getAttribute("href")).toBe("/check-ins")
		})

		test("deve exibir link 'Ver todos' mesmo quando há check-ins", () => {
			const checkIns = [makeCheckIn({ id: "1" })]
			render(<CheckinsTimeline checkIns={checkIns} />)

			const link = screen.getByRole("link", { name: /ver todos/i })
			expect(link.getAttribute("href")).toBe("/check-ins")
		})
	})

	describe("RF-022: estado de carregamento", () => {
		test("deve exibir skeletons durante carregamento", () => {
			render(<CheckinsTimeline checkIns={[]} isLoading />)

			const skeletons = screen.getAllByTestId("skeleton")
			expect(skeletons.length).toBeGreaterThan(0)
		})
	})
})
