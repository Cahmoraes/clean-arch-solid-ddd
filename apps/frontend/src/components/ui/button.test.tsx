import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Button } from "./button"

describe("Button", () => {
	test("deve renderizar filhos e ter type=button por padrão", () => {
		render(<Button>Click me</Button>)
		const btn = screen.getByRole("button", { name: "Click me" })
		expect(btn).toBeInTheDocument()
		expect(btn).toHaveAttribute("type", "button")
	})

	test("deve renderizar com rounded-md por padrão", () => {
		render(<Button>Clique aqui</Button>)
		const button = screen.getByRole("button", { name: "Clique aqui" })
		expect(button).toHaveClass("rounded-md")
		expect(button).not.toHaveClass("rounded-full")
	})

	test("deve aplicar classes da variante primária (bg e text semânticos)", () => {
		render(<Button variant="primary">Primary</Button>)
		const btn = screen.getByRole("button", { name: "Primary" })
		expect(btn.className).toContain("bg-primary")
		expect(btn.className).toContain("text-primary-foreground")
	})

	test("deve aplicar classes da variante secundária (bg e text semânticos)", () => {
		render(<Button variant="secondary">Secondary</Button>)
		const btn = screen.getByRole("button", { name: "Secondary" })
		expect(btn.className).toContain("bg-secondary")
		expect(btn.className).toContain("text-secondary-foreground")
	})

	test("deve aplicar classes da variante outline (surface, border, accent hover)", () => {
		render(<Button variant="outline">Outline</Button>)
		const btn = screen.getByRole("button", { name: "Outline" })
		expect(btn.className).toContain("bg-card")
		expect(btn.className).toContain("text-card-foreground")
		expect(btn.className).toContain("border-border")
	})

	test("não deve aplicar nenhuma utilidade de shadow", () => {
		render(<Button>Plain</Button>)
		const btn = screen.getByRole("button", { name: "Plain" })
		expect(btn.className).not.toMatch(/\bshadow-/)
	})

	test("deve encaminhar nomes de classes adicionais", () => {
		render(<Button className="custom-class">x</Button>)
		expect(screen.getByRole("button")).toHaveClass("custom-class")
	})

	test("deve respeitar a variante de tamanho", () => {
		render(<Button size="sm">small</Button>)
		expect(screen.getByRole("button").className).toContain("h-8")
	})

	test("deve renderizar como elemento filho quando asChild é verdadeiro", () => {
		render(
			<Button asChild>
				<a href="/x">link</a>
			</Button>,
		)
		const link = screen.getByRole("link", { name: "link" })
		expect(link).toBeInTheDocument()
		expect(link.className).toContain("rounded-md")
		expect(link.className).not.toContain("rounded-full")
	})
})
