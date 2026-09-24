import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Eyebrow } from "./eyebrow"

describe("Eyebrow", () => {
	test("rótulo em ciano, mono e maiúsculo", () => {
		render(<Eyebrow>Admin</Eyebrow>)
		expect(screen.getByText("Admin")).toHaveClass(
			"font-mono",
			"uppercase",
			"text-accent",
		)
	})
})
