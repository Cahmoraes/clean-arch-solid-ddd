import { useQueryClient } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { describe, expect, it } from "vitest"
import { renderWithProviders } from "./render"

function QueryClientProbe(): ReactElement {
	const client = useQueryClient()
	return <span data-testid="probe">{client ? "has-client" : "missing"}</span>
}

describe("renderWithProviders", () => {
	it("wraps the component in a QueryClientProvider", () => {
		renderWithProviders(<QueryClientProbe />)
		expect(screen.getByTestId("probe")).toHaveTextContent("has-client")
	})
})
