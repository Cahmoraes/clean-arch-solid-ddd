import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { NumberedPagination } from "./numbered-pagination"

describe("NumberedPagination", () => {
	it("renders testids with given prefix", () => {
		render(
			<NumberedPagination
				page={1}
				totalPages={3}
				onChange={vi.fn()}
				testIdPrefix="test"
			/>,
		)

		expect(screen.getByTestId("test-pagination")).toBeInTheDocument()
		expect(screen.getByTestId("test-prev")).toBeInTheDocument()
		expect(screen.getByTestId("test-page-1")).toBeInTheDocument()
		expect(screen.getByTestId("test-next")).toBeInTheDocument()
	})

	it("calls onChange with clicked page", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={1}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-page-2"))

		expect(onChange).toHaveBeenCalledWith(2)
	})

	it("calls onChange with page - 1 on prev click", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={2}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-prev"))

		expect(onChange).toHaveBeenCalledWith(1)
	})

	it("calls onChange with page + 1 on next click", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={1}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-next"))

		expect(onChange).toHaveBeenCalledWith(2)
	})

	it("does not go below page 1 on prev", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={1}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-prev"))

		expect(onChange).not.toHaveBeenCalled()
	})

	it("does not go above totalPages on next", async () => {
		const onChange = vi.fn()
		const user = userEvent.setup()
		render(
			<NumberedPagination
				page={3}
				totalPages={3}
				onChange={onChange}
				testIdPrefix="test"
			/>,
		)

		await user.click(screen.getByTestId("test-next"))

		expect(onChange).not.toHaveBeenCalled()
	})

	it("marks correct page as active", () => {
		render(
			<NumberedPagination
				page={2}
				totalPages={5}
				onChange={vi.fn()}
				testIdPrefix="test"
			/>,
		)

		const page2 = screen.getByTestId("test-page-2")
		expect(page2).toHaveAttribute("aria-current", "page")
	})

	it("shows window of 5 pages max", () => {
		render(
			<NumberedPagination
				page={5}
				totalPages={10}
				onChange={vi.fn()}
				testIdPrefix="test"
			/>,
		)

		expect(screen.getByTestId("test-page-3")).toBeInTheDocument()
		expect(screen.getByTestId("test-page-7")).toBeInTheDocument()
		expect(screen.queryByTestId("test-page-1")).not.toBeInTheDocument()
		expect(screen.queryByTestId("test-page-10")).not.toBeInTheDocument()
	})
})
