import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { CheckInSortToggle } from "./check-in-sort-toggle"

describe("CheckInSortToggle", () => {
	test("exibe 'Mais recentes' quando value é desc", () => {
		render(<CheckInSortToggle value="desc" onValueChange={vi.fn()} />)
		expect(screen.getByText(/mais recentes/i)).toBeInTheDocument()
	})

	test("exibe 'Mais antigos' quando value é asc", () => {
		render(<CheckInSortToggle value="asc" onValueChange={vi.fn()} />)
		expect(screen.getByText(/mais antigos/i)).toBeInTheDocument()
	})

	test("chama onValueChange com asc ao clicar quando value é desc", async () => {
		const onValueChange = vi.fn()
		render(<CheckInSortToggle value="desc" onValueChange={onValueChange} />)
		await userEvent.click(screen.getByRole("button"))
		expect(onValueChange).toHaveBeenCalledWith("asc")
	})

	test("chama onValueChange com desc ao clicar quando value é asc", async () => {
		const onValueChange = vi.fn()
		render(<CheckInSortToggle value="asc" onValueChange={onValueChange} />)
		await userEvent.click(screen.getByRole("button"))
		expect(onValueChange).toHaveBeenCalledWith("desc")
	})
})
