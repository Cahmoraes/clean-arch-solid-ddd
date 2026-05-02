import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import PublicError from "./error"

describe("PublicError", () => {
	it("renders friendly fallback UI with retry button", () => {
		const reset = vi.fn()
		const error = new Error("boom") as Error & { digest?: string }

		vi.spyOn(console, "error").mockImplementation(() => {})

		render(<PublicError error={error} reset={reset} />)

		expect(
			screen.getByRole("heading", { name: /Algo deu errado/i }),
		).toBeInTheDocument()
		expect(screen.getByTestId("public-error-retry")).toBeInTheDocument()
	})

	it("invokes reset() when retry button is clicked", async () => {
		const reset = vi.fn()
		const error = new Error("boom") as Error & { digest?: string }

		vi.spyOn(console, "error").mockImplementation(() => {})

		render(<PublicError error={error} reset={reset} />)

		await userEvent.click(screen.getByTestId("public-error-retry"))

		expect(reset).toHaveBeenCalledOnce()
	})
})
