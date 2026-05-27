import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { UserStats } from "../types"
import { UserFilterBar } from "./user-filter-bar"

const COUNTS: UserStats = {
	total: 48,
	members: 41,
	admins: 7,
	active: 45,
	inactive: 3,
}

describe("UserFilterBar", () => {
	test("deve renderizar as cinco tabs de filtro", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				counts={COUNTS}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(screen.getByRole("button", { name: /todos/i })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /membros/i })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /administradores/i }),
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /^ativos/i })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /^inativos/i }),
		).toBeInTheDocument()
	})

	test("deve exibir os contadores em cada tab", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				counts={COUNTS}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(screen.getByText("48")).toBeInTheDocument()
		expect(screen.getByText("41")).toBeInTheDocument()
		expect(screen.getByText("7")).toBeInTheDocument()
		expect(screen.getByText("45")).toBeInTheDocument()
		expect(screen.getByText("3")).toBeInTheDocument()
	})

	test("deve marcar a tab ativa com aria-pressed=true", () => {
		render(
			<UserFilterBar
				activeFilter="member"
				counts={COUNTS}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(screen.getByRole("button", { name: /membros/i })).toHaveAttribute(
			"aria-pressed",
			"true",
		)
		expect(screen.getByRole("button", { name: /todos/i })).toHaveAttribute(
			"aria-pressed",
			"false",
		)
	})

	test("deve chamar onFilterChange com o valor correto ao clicar em uma tab", async () => {
		const onFilterChange = vi.fn()
		render(
			<UserFilterBar
				activeFilter="all"
				counts={COUNTS}
				onFilterChange={onFilterChange}
			/>,
		)
		await userEvent.click(
			screen.getByRole("button", { name: /administradores/i }),
		)
		expect(onFilterChange).toHaveBeenCalledWith("admin")
	})

	test("deve chamar onFilterChange com 'all' ao clicar em Todos", async () => {
		const onFilterChange = vi.fn()
		render(
			<UserFilterBar
				activeFilter="member"
				counts={COUNTS}
				onFilterChange={onFilterChange}
			/>,
		)
		await userEvent.click(screen.getByRole("button", { name: /todos/i }))
		expect(onFilterChange).toHaveBeenCalledWith("all")
	})
})
