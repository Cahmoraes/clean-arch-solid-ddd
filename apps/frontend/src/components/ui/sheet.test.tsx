import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "./sheet"

describe("Sheet", () => {
	test("SheetContent tem padding horizontal e SheetHeader/SheetFooter não duplicam o padding", () => {
		render(
			<Sheet open>
				<SheetContent side="bottom">
					<SheetHeader>
						<SheetTitle>Filtros</SheetTitle>
					</SheetHeader>
					<SheetFooter>rodapé</SheetFooter>
				</SheetContent>
			</Sheet>,
		)

		const content = screen.getByRole("dialog")
		expect(content).toHaveClass("px-4")

		const header = document.querySelector('[data-slot="sheet-header"]')
		expect(header).toHaveClass("py-4")
		expect(header).not.toHaveClass("p-4")

		const footer = document.querySelector('[data-slot="sheet-footer"]')
		expect(footer).toHaveClass("py-4")
		expect(footer).not.toHaveClass("p-4")
	})
})
