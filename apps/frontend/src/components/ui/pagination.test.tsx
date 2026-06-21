import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { PaginationNext, PaginationPrevious } from "./pagination"

describe("PaginationPrevious", () => {
	test("não renderiza o texto 'Anterior'", () => {
		render(<PaginationPrevious href="#" />)
		expect(screen.queryByText("Anterior")).not.toBeInTheDocument()
	})

	test("tem aria-label para screen readers", () => {
		render(<PaginationPrevious href="#" />)
		expect(
			screen.getByRole("link", { name: "Go to previous page" }),
		).toBeInTheDocument()
	})
})

describe("PaginationNext", () => {
	test("não renderiza o texto 'Próxima'", () => {
		render(<PaginationNext href="#" />)
		expect(screen.queryByText("Próxima")).not.toBeInTheDocument()
	})

	test("tem aria-label para screen readers", () => {
		render(<PaginationNext href="#" />)
		expect(
			screen.getByRole("link", { name: "Go to next page" }),
		).toBeInTheDocument()
	})
})
