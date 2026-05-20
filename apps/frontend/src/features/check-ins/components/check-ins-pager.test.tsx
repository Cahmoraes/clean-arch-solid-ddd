import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { CheckInsPager } from "./check-ins-pager.js"

describe("CheckInsPager", () => {
	it("returns null when pages <= 1", () => {
		const { container } = render(
			<CheckInsPager page={1} pages={1} onChange={vi.fn()} />,
		)
		expect(container.firstChild).toBeNull()
	})

	it("returns null when pages is 0", () => {
		const { container } = render(
			<CheckInsPager page={1} pages={0} onChange={vi.fn()} />,
		)
		expect(container.firstChild).toBeNull()
	})

	it("renders prev/next buttons when pages > 1", () => {
		render(<CheckInsPager page={2} pages={3} onChange={vi.fn()} />)
		expect(screen.getByTestId("checkins-prev")).toBeInTheDocument()
		expect(screen.getByTestId("checkins-next")).toBeInTheDocument()
	})

	it("uses custom testId prefix", () => {
		render(
			<CheckInsPager page={2} pages={3} onChange={vi.fn()} testId="admin-checkins" />,
		)
		expect(screen.getByTestId("admin-checkins-prev")).toBeInTheDocument()
		expect(screen.getByTestId("admin-checkins-next")).toBeInTheDocument()
	})

	it("displays current page number", () => {
		render(<CheckInsPager page={3} pages={5} onChange={vi.fn()} />)
		expect(screen.getByText("3")).toBeInTheDocument()
	})

	it("calls onChange with page - 1 when prev clicked", async () => {
		const onChange = vi.fn()
		render(<CheckInsPager page={3} pages={5} onChange={onChange} />)
		await userEvent.click(screen.getByTestId("checkins-prev"))
		expect(onChange).toHaveBeenCalledWith(2)
	})

	it("calls onChange with page + 1 when next clicked", async () => {
		const onChange = vi.fn()
		render(<CheckInsPager page={3} pages={5} onChange={onChange} />)
		await userEvent.click(screen.getByTestId("checkins-next"))
		expect(onChange).toHaveBeenCalledWith(4)
	})

	it("disables prev on first page", () => {
		render(<CheckInsPager page={1} pages={3} onChange={vi.fn()} />)
		expect(screen.getByTestId("checkins-prev")).toHaveAttribute(
			"aria-disabled",
			"true",
		)
	})

	it("disables next on last page", () => {
		render(<CheckInsPager page={3} pages={3} onChange={vi.fn()} />)
		expect(screen.getByTestId("checkins-next")).toHaveAttribute(
			"aria-disabled",
			"true",
		)
	})

	it("does not call onChange when prev clicked on first page", async () => {
		const onChange = vi.fn()
		render(<CheckInsPager page={1} pages={3} onChange={onChange} />)
		await userEvent.click(screen.getByTestId("checkins-prev"))
		expect(onChange).not.toHaveBeenCalled()
	})

	it("does not call onChange when next clicked on last page", async () => {
		const onChange = vi.fn()
		render(<CheckInsPager page={3} pages={3} onChange={onChange} />)
		await userEvent.click(screen.getByTestId("checkins-next"))
		expect(onChange).not.toHaveBeenCalled()
	})
})
