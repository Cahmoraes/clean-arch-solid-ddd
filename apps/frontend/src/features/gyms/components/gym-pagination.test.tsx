import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { GymPagination } from "./gym-pagination"

describe("GymPagination", () => {
	test("a página ativa tem contorno e fundo suave em ciano", () => {
		render(<GymPagination page={2} totalPages={4} onChange={vi.fn()} />)
		expect(screen.getByTestId("gym-pagination-page-2")).toHaveClass(
			"border-accent",
			"bg-accent/10",
		)
		expect(screen.getByTestId("gym-pagination-page-1")).not.toHaveClass(
			"border-accent",
		)
	})
})
