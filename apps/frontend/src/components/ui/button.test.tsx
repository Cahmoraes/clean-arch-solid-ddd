import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Button } from "./button"

describe("Button", () => {
	it("renders children and is type=button by default", () => {
		render(<Button>Click me</Button>)
		const btn = screen.getByRole("button", { name: "Click me" })
		expect(btn).toBeInTheDocument()
		expect(btn).toHaveAttribute("type", "button")
	})

	it("applies pill-shaped radius (rounded-full) on the default variant", () => {
		render(<Button>Primary</Button>)
		const btn = screen.getByRole("button", { name: "Primary" })
		expect(btn.className).toContain("rounded-full")
	})

	it("applies primary variant classes (black bg, white text)", () => {
		render(<Button variant="primary">Primary</Button>)
		const btn = screen.getByRole("button", { name: "Primary" })
		expect(btn.className).toContain("bg-pure-black")
		expect(btn.className).toContain("text-pure-white")
	})

	it("applies secondary variant classes (light gray bg, near black text)", () => {
		render(<Button variant="secondary">Secondary</Button>)
		const btn = screen.getByRole("button", { name: "Secondary" })
		expect(btn.className).toContain("bg-light-gray")
		expect(btn.className).toContain("text-near-black")
	})

	it("applies outline variant classes (white bg, dark text, light border)", () => {
		render(<Button variant="outline">Outline</Button>)
		const btn = screen.getByRole("button", { name: "Outline" })
		expect(btn.className).toContain("bg-pure-white")
		expect(btn.className).toContain("text-button-text-dark")
		expect(btn.className).toContain("border-border-light")
	})

	it("does not apply any shadow utility", () => {
		render(<Button>Plain</Button>)
		const btn = screen.getByRole("button", { name: "Plain" })
		expect(btn.className).not.toMatch(/\bshadow-/)
	})

	it("forwards additional class names", () => {
		render(<Button className="custom-class">x</Button>)
		expect(screen.getByRole("button")).toHaveClass("custom-class")
	})

	it("respects size variant", () => {
		render(<Button size="sm">small</Button>)
		expect(screen.getByRole("button").className).toContain("h-8")
	})

	it("renders as a child element when asChild is true", () => {
		render(
			<Button asChild>
				<a href="/x">link</a>
			</Button>,
		)
		const link = screen.getByRole("link", { name: "link" })
		expect(link).toBeInTheDocument()
		expect(link.className).toContain("rounded-full")
	})
})
