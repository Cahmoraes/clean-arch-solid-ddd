import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Skeleton } from "./skeleton"

describe("Skeleton", () => {
	it("renders with pulse animation class", () => {
		render(<Skeleton />)
		const node = screen.getByTestId("skeleton")
		expect(node.className).toContain("animate-pulse")
	})

	it("uses container radius (12px) by default", () => {
		render(<Skeleton />)
		const node = screen.getByTestId("skeleton")
		expect(node.className).toContain("rounded-[12px]")
	})

	it("forwards class names", () => {
		render(<Skeleton className="h-4 w-20" />)
		const node = screen.getByTestId("skeleton")
		expect(node).toHaveClass("h-4")
		expect(node).toHaveClass("w-20")
	})
})
