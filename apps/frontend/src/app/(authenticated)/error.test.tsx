import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import AuthenticatedError from "./error"

describe("AuthenticatedError", () => {
	it("renders friendly fallback UI with retry button", () => {
		const reset = vi.fn()
		const error = new Error("boom") as Error & { digest?: string }

		vi.spyOn(console, "error").mockImplementation(() => {})

		render(<AuthenticatedError error={error} reset={reset} />)

		expect(
			screen.getByRole("heading", {
				name: /Não foi possível carregar esta página/i,
			}),
		).toBeInTheDocument()
		expect(screen.getByTestId("authenticated-error-retry")).toBeInTheDocument()
	})

	it("invokes reset() when retry button is clicked", async () => {
		const reset = vi.fn()
		const error = new Error("boom") as Error & { digest?: string }

		vi.spyOn(console, "error").mockImplementation(() => {})

		render(<AuthenticatedError error={error} reset={reset} />)

		await userEvent.click(screen.getByTestId("authenticated-error-retry"))

		expect(reset).toHaveBeenCalledOnce()
	})
})
