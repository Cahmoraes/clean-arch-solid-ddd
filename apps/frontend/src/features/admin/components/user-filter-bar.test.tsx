import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { UserStats } from "../types"
import { UserFilterBar } from "./user-filter-bar"

const STATS: UserStats = {
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
				stats={STATS}
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

	test("deve exibir os contadores em cada tab quando stats estão presentes", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				stats={STATS}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(screen.getByText("48")).toBeInTheDocument()
		expect(screen.getByText("41")).toBeInTheDocument()
		expect(screen.getByText("7")).toBeInTheDocument()
		expect(screen.getByText("45")).toBeInTheDocument()
		expect(screen.getByText("3")).toBeInTheDocument()
	})

	test("não deve exibir badges quando stats são undefined (loading)", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				stats={undefined}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(screen.queryByText("48")).not.toBeInTheDocument()
		expect(screen.queryByText("0")).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: /^todos$/i })).toBeInTheDocument()
	})

	test("deve marcar a tab ativa com aria-pressed=true", () => {
		render(
			<UserFilterBar
				activeFilter="member"
				stats={STATS}
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
				stats={STATS}
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
				stats={STATS}
				onFilterChange={onFilterChange}
			/>,
		)
		await userEvent.click(screen.getByRole("button", { name: /todos/i }))
		expect(onFilterChange).toHaveBeenCalledWith("all")
	})
})

describe("UserFilterBar — mobile sheet", () => {
	test("exibe botão Filtros no DOM (versão mobile presente)", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				stats={STATS}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /abrir filtros/i }),
		).toBeInTheDocument()
	})

	test("exibe chip com label do filtro ativo quando não é all", () => {
		render(
			<UserFilterBar
				activeFilter="admin"
				stats={STATS}
				onFilterChange={vi.fn()}
			/>,
		)
		const chips = screen
			.queryAllByText("Administradores")
			.filter((el) => el.tagName === "SPAN")
		expect(chips).toHaveLength(1)
	})

	test("não exibe chip quando activeFilter é all", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				stats={STATS}
				onFilterChange={vi.fn()}
			/>,
		)
		const chips = screen
			.queryAllByText("Administradores")
			.filter((el) => el.tagName === "SPAN")
		expect(chips).toHaveLength(0)
	})

	test("abre o Sheet ao clicar no botão Filtros", async () => {
		render(
			<UserFilterBar
				activeFilter="all"
				stats={STATS}
				onFilterChange={vi.fn()}
			/>,
		)
		await userEvent.click(
			screen.getByRole("button", { name: /abrir filtros/i }),
		)
		expect(screen.getByRole("dialog")).toBeInTheDocument()
	})

	test("chama onFilterChange com all ao clicar em Limpar", async () => {
		const onFilterChange = vi.fn()
		render(
			<UserFilterBar
				activeFilter="member"
				stats={STATS}
				onFilterChange={onFilterChange}
			/>,
		)
		await userEvent.click(
			screen.getByRole("button", { name: /abrir filtros/i }),
		)
		await userEvent.click(screen.getByRole("button", { name: /^limpar$/i }))
		expect(onFilterChange).toHaveBeenCalledWith("all")
	})

	test("chama onFilterChange com pendingFilter ao clicar em Aplicar", async () => {
		const onFilterChange = vi.fn()
		render(
			<UserFilterBar
				activeFilter="all"
				stats={STATS}
				onFilterChange={onFilterChange}
			/>,
		)
		await userEvent.click(
			screen.getByRole("button", { name: /abrir filtros/i }),
		)
		await userEvent.click(screen.getByRole("button", { name: /^aplicar$/i }))
		expect(onFilterChange).toHaveBeenCalledWith("all")
	})
})
