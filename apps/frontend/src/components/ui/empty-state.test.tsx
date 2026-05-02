import { render, screen } from "@testing-library/react"
import { Bell } from "lucide-react"
import { describe, expect, it, vi } from "vitest"
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
