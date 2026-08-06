import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import { Button } from "./button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./dialog"

function ControlledDialog() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Open</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Hello</DialogTitle>
					<DialogDescription>Some description</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	)
}

describe("Dialog", () => {
	test("DialogContent deve ter rounded-xl, shadow-md, respiro lateral e contenção vertical", () => {
		render(
			<Dialog open>
				<DialogContent>conteúdo</DialogContent>
			</Dialog>,
		)
		const content = screen.getByRole("dialog")
		expect(content).toHaveClass("rounded-xl")
		expect(content).toHaveClass("shadow-md")
		expect(content).toHaveClass("w-[calc(100%-2rem)]")
		expect(content).toHaveClass("max-h-[calc(100dvh-2rem)]")
		expect(content).toHaveClass("overflow-y-auto")
	})

	test("opens via trigger and closes via close button", async () => {
		const user = userEvent.setup()
		render(<ControlledDialog />)

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: "Open" }))
		expect(await screen.findByRole("dialog")).toBeInTheDocument()
		expect(screen.getByText("Hello")).toBeInTheDocument()
		expect(screen.getByText("Some description")).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /close/i }))
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	test("closes when pressing Escape", async () => {
		const user = userEvent.setup()
		render(<ControlledDialog />)
		await user.click(screen.getByRole("button", { name: "Open" }))
		expect(await screen.findByRole("dialog")).toBeInTheDocument()
		await user.keyboard("{Escape}")
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})
})
