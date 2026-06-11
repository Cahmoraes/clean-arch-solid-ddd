/**
 * Acceptance tests — US-003 (RF-007 + RF-008)
 *
 * RF-007: loading state → pills sem badge (sem placeholder de zero)
 * RF-008: error state  → pills sem badge (degradação silenciosa)
 *
 * Ambos os estados produzem stats=undefined → mesmo caminho de código em UserFilterBar.
 * RF-007 já coberto em user-filter-bar.test.tsx ("não deve exibir badges quando stats são undefined").
 * Este arquivo adiciona cobertura explícita para RF-008 (error state) e documenta a cadeia.
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import type { UserStats } from "../../../../apps/frontend/src/features/admin/types"
import { UserFilterBar } from "../../../../apps/frontend/src/features/admin/components/user-filter-bar"

// ---------------------------------------------------------------------------
// NOTE: Este arquivo reside fora do source tree (docs/…) e é executado apenas
// como artefato de QA.  Importa diretamente do source tree para verificar
// comportamento real sem duplicar lógica.
// ---------------------------------------------------------------------------

describe("US-003 — pills sem badge em loading/error (RF-007 + RF-008)", () => {
	/**
	 * RF-007 — Durante carregamento, stats = undefined (TanStack Query default).
	 * Replicamos o mesmo assert do teste de unidade existente para documentar
	 * a cobertura de acceptance explicitamente.
	 */
	test("RF-007: não exibe badge nem zero durante loading (stats=undefined)", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				stats={undefined}
				onFilterChange={vi.fn()}
			/>,
		)

		// Nenhum zero exibido como placeholder
		expect(screen.queryByText("0")).not.toBeInTheDocument()

		// Pills ainda renderizam (degradação silenciosa, não falha total)
		expect(screen.getByRole("button", { name: /^todos$/i })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /membros/i })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /administradores/i }),
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /^ativos/i })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /^inativos/i }),
		).toBeInTheDocument()
	})

	/**
	 * RF-008 — Em caso de erro na query, TanStack Query mantém data=undefined
	 * (sem initialData). page.tsx passa stats={stats} → UserFilterBar recebe
	 * undefined → mesmo comportamento de RF-007.
	 *
	 * Simulamos o estado pós-erro passando undefined diretamente, replicando
	 * o que useUserStats() entrega quando isError=true.
	 */
	test("RF-008: não exibe badge nem zero em caso de erro (stats=undefined após erro)", () => {
		// stats=undefined simula o valor que useUserStats() retorna em isError=true
		// (TanStack Query não define data quando a queryFn lança exceção e não há
		// initialData ou placeholderData configurados)
		render(
			<UserFilterBar
				activeFilter="all"
				stats={undefined}
				onFilterChange={vi.fn()}
			/>,
		)

		// Degradação silenciosa: sem badge, sem zero, pills visíveis
		expect(screen.queryByText("0")).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: /^todos$/i })).toBeInTheDocument()
	})

	/**
	 * Contrato: quando stats presentes, badges exibem valores reais (controle).
	 */
	test("exibe badges com valores reais quando stats disponíveis (controle)", () => {
		const stats: UserStats = {
			total: 48,
			members: 41,
			admins: 7,
			active: 45,
			inactive: 3,
		}

		render(
			<UserFilterBar
				activeFilter="all"
				stats={stats}
				onFilterChange={vi.fn()}
			/>,
		)

		expect(screen.getByText("48")).toBeInTheDocument()
		expect(screen.getByText("41")).toBeInTheDocument()
		expect(screen.getByText("7")).toBeInTheDocument()
		expect(screen.getByText("45")).toBeInTheDocument()
		expect(screen.getByText("3")).toBeInTheDocument()
		expect(screen.queryByText("0")).not.toBeInTheDocument()
	})
})
