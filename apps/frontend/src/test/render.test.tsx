import { useQueryClient } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { describe, expect, it } from "vitest"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
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

	it("envolve o componente em um TooltipProvider (tooltip abre no hover)", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<Tooltip>
				<TooltipTrigger>Ação</TooltipTrigger>
				<TooltipContent>Dica</TooltipContent>
			</Tooltip>,
		)
		await user.hover(screen.getByText("Ação"))
		expect(await screen.findByRole("tooltip")).toBeInTheDocument()
	})
})
