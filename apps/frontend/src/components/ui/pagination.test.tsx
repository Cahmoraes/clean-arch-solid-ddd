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

	test("oculta o ícone decorativo de leitores de tela e preserva o href", () => {
		render(<PaginationPrevious href="/page/1" />)
		const link = screen.getByRole("link", { name: "Go to previous page" })
		expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
		expect(link).toHaveAttribute("href", "/page/1")
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

	test("oculta o ícone decorativo de leitores de tela e preserva o href", () => {
		render(<PaginationNext href="/page/2" />)
		const link = screen.getByRole("link", { name: "Go to next page" })
		expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
		expect(link).toHaveAttribute("href", "/page/2")
	})
})
