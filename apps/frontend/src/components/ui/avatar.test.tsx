import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Avatar } from "./avatar"

describe("Avatar", () => {
	test("exibe as iniciais derivadas do nome", () => {
		render(<Avatar name="Caique Moraes" />)
		expect(screen.getByText("CM")).toBeInTheDocument()
	})

	test("usa fallback quando não há nome", () => {
		render(<Avatar />)
		expect(screen.getByText("?")).toBeInTheDocument()
	})

	test.each([
		"sm",
		"md",
		"lg",
	] as const)("tamanho %s nunca usa rounded-full", (size) => {
		render(<Avatar size={size} name="Ana" />)
		expect(screen.getByText("A")).not.toHaveClass("rounded-full")
	})

	test("sm e md usam rounded-sm; lg usa rounded-md", () => {
		const { rerender } = render(<Avatar size="sm" name="Ana" />)
		expect(screen.getByText("A")).toHaveClass("rounded-sm")
		rerender(<Avatar size="md" name="Ana" />)
		expect(screen.getByText("A")).toHaveClass("rounded-sm")
		rerender(<Avatar size="lg" name="Ana" />)
		expect(screen.getByText("A")).toHaveClass("rounded-md")
	})
})
