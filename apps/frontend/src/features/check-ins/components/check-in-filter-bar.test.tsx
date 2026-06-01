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
