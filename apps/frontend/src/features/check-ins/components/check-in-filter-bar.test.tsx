import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { CheckInStats } from "../api/extended-paths.js"
import { CheckInFilterBar } from "./check-in-filter-bar"

describe("CheckInFilterBar", () => {
	test("renderiza os pills de filtro sem badges quando stats não é fornecido", () => {
		render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
		expect(screen.getByRole("group")).toBeInTheDocument()
		expect(screen.getByText("Todos")).toBeInTheDocument()
		expect(screen.queryByText("42")).not.toBeInTheDocument()
	})

	test("exibe badges flutuantes de contagem quando stats é fornecido", () => {
		const stats: CheckInStats = {
			total: 42,
			pending: 10,
			validated: 20,
			rejected: 12,
		}
		render(
			<CheckInFilterBar
				status={undefined}
				onStatusChange={vi.fn()}
				stats={stats}
			/>,
		)
		expect(screen.getByText("42")).toBeInTheDocument()
		expect(screen.getByText("10")).toBeInTheDocument()
		expect(screen.getByText("20")).toBeInTheDocument()
		expect(screen.getByText("12")).toBeInTheDocument()
	})

	test("chama onStatusChange com undefined ao clicar em Todos", async () => {
		const onStatusChange = vi.fn()
		render(
			<CheckInFilterBar status="pending" onStatusChange={onStatusChange} />,
		)
		await userEvent.click(screen.getByText("Todos"))
		expect(onStatusChange).toHaveBeenCalledWith(undefined)
	})

	test("chama onStatusChange com pending ao clicar em Pendentes", async () => {
		const onStatusChange = vi.fn()
		render(
			<CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />,
		)
		await userEvent.click(screen.getByText("Pendentes"))
		expect(onStatusChange).toHaveBeenCalledWith("pending")
	})
})

describe("CheckInFilterBar — mobile sheet", () => {
	test("exibe botão Filtros no DOM (versão mobile presente)", () => {
		render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
		expect(
			screen.getByRole("button", { name: /abrir filtros/i }),
		).toBeInTheDocument()
	})

	test("exibe chip com label do filtro ativo quando status é definido", () => {
		render(<CheckInFilterBar status="pending" onStatusChange={vi.fn()} />)
		const chips = screen
			.queryAllByText("Pendentes")
			.filter((el) => el.tagName === "SPAN")
		expect(chips).toHaveLength(1)
	})

	test("não exibe chip quando status é undefined", () => {
		render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
		const approvedChips = screen
			.queryAllByText("Aprovados")
			.filter((el) => el.tagName === "SPAN")
		const rejectedChips = screen
			.queryAllByText("Rejeitados")
			.filter((el) => el.tagName === "SPAN")
		expect(approvedChips).toHaveLength(0)
		expect(rejectedChips).toHaveLength(0)
	})

	test("abre o Sheet ao clicar no botão Filtros e exibe os itens", async () => {
		render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
		await userEvent.click(
			screen.getByRole("button", { name: /abrir filtros/i }),
		)
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		expect(screen.getAllByText("Todos").length).toBeGreaterThanOrEqual(1)
	})

	test("chama onStatusChange com pendingStatus ao clicar em Aplicar", async () => {
		const onStatusChange = vi.fn()
		render(
			<CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />,
		)
		await userEvent.click(
			screen.getByRole("button", { name: /abrir filtros/i }),
		)
		const dialog = screen.getByRole("dialog")
		await userEvent.click(
			dialog
				.querySelector("button[aria-pressed]")!
				.closest("fieldset")!
				.querySelectorAll("button")[1],
		)
		await userEvent.click(screen.getByRole("button", { name: /^aplicar$/i }))
		expect(onStatusChange).toHaveBeenCalledWith("pending")
	})

	test("chama onStatusChange com undefined ao clicar em Limpar", async () => {
		const onStatusChange = vi.fn()
		render(
			<CheckInFilterBar status="pending" onStatusChange={onStatusChange} />,
		)
		await userEvent.click(
			screen.getByRole("button", { name: /abrir filtros/i }),
		)
		await userEvent.click(screen.getByRole("button", { name: /^limpar$/i }))
		expect(onStatusChange).toHaveBeenCalledWith(undefined)
	})
})
