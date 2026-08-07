import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip"

function renderTooltip() {
	return render(
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>Ação</TooltipTrigger>
				<TooltipContent>Conteúdo do tooltip</TooltipContent>
			</Tooltip>
		</TooltipProvider>,
	)
}

describe("Tooltip", () => {
	test("exibe o conteúdo ao passar o mouse (hover) sobre o trigger", async () => {
		const user = userEvent.setup()
		renderTooltip()
		await user.hover(screen.getByText("Ação"))
		expect(await screen.findByRole("tooltip")).toHaveTextContent(
			"Conteúdo do tooltip",
		)
	})

	test("exibe o conteúdo ao focar o trigger via teclado", async () => {
		const user = userEvent.setup()
		renderTooltip()
		await user.tab()
		expect(screen.getByText("Ação")).toHaveFocus()
		expect(await screen.findByRole("tooltip")).toHaveTextContent(
			"Conteúdo do tooltip",
		)
	})
})
