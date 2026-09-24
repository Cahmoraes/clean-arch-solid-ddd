import { render, screen } from "@testing-library/react"
import { describe, expect, it, test, vi } from "vitest"
import { Bell } from "@/components/ui/pixel-icons"
import { Button } from "./button"
import { EmptyState } from "./empty-state"

describe("EmptyState", () => {
	it("renders title", () => {
		render(<EmptyState title="Nothing here" />)
		expect(
			screen.getByRole("heading", { name: "Nothing here" }),
		).toBeInTheDocument()
	})

	it("renders description when provided", () => {
		render(<EmptyState title="Empty" description="No items yet" />)
		expect(screen.getByText("No items yet")).toBeInTheDocument()
	})

	it("does not render description when not provided", () => {
		render(<EmptyState title="Empty" />)
		expect(screen.queryByText(/No items yet/i)).not.toBeInTheDocument()
	})

	it("renders the action element when provided", () => {
		const onClick = vi.fn()
		render(
			<EmptyState
				title="Empty"
				action={<Button onClick={onClick}>Create</Button>}
			/>,
		)
		expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument()
	})

	it("renders an icon when provided", () => {
		const { container } = render(<EmptyState title="Empty" icon={Bell} />)
		expect(container.querySelector("svg")).not.toBeNull()
	})

	it("has live region role for accessibility", () => {
		render(<EmptyState title="Empty" />)
		expect(screen.getByRole("status")).toBeInTheDocument()
	})
})

describe("EmptyState com cena", () => {
	test("sem a prop scene não renderiza cena (comportamento atual)", () => {
		const { container } = render(<EmptyState title="Vazio" />)
		expect(container.querySelector("[data-scene]")).toBeNull()
	})

	test("com scene empty renderiza a cena decorativa ao lado do texto", () => {
		const { container } = render(
			<EmptyState
				scene="empty"
				title="Nenhuma academia encontrada"
				description="Tente outro termo."
			/>,
		)
		const scene = container.querySelector('[data-scene="empty"]')
		expect(scene).toBeInTheDocument()
		expect(scene).toHaveAttribute("aria-hidden", "true")
		expect(
			screen.getByRole("heading", { name: "Nenhuma academia encontrada" }),
		).toBeInTheDocument()
		expect(screen.getByText("Tente outro termo.")).toBeInTheDocument()
	})

	test("com scene continua havendo uma única região de status", () => {
		render(<EmptyState scene="empty" title="Vazio" />)
		expect(screen.getAllByRole("status")).toHaveLength(1)
	})

	test("com scene, ação e ícone continuam sendo exibidos", () => {
		render(
			<EmptyState
				scene="empty"
				icon={Bell}
				title="Vazio"
				action={<Button>Criar</Button>}
			/>,
		)
		expect(screen.getByRole("button", { name: "Criar" })).toBeInTheDocument()
	})
})
