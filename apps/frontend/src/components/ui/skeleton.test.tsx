import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Skeleton } from "./skeleton"

describe("Skeleton", () => {
	it("renders with pulse animation class", () => {
		render(<Skeleton />)
		const node = screen.getByTestId("skeleton")
		expect(node.className).toContain("animate-pulse")
	})

	it("não usa mais rounded-[12px]; usa o token de chanfro rounded-md", () => {
		render(<Skeleton />)
		const node = screen.getByTestId("skeleton")
		expect(node).not.toHaveClass("rounded-[12px]")
		expect(node).toHaveClass("rounded-md")
	})

	it("forwards class names", () => {
		render(<Skeleton className="h-4 w-20" />)
		const node = screen.getByTestId("skeleton")
		expect(node).toHaveClass("h-4")
		expect(node).toHaveClass("w-20")
	})
})
