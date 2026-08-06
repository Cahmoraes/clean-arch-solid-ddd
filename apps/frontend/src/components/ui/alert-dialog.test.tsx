import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
} from "./alert-dialog"

describe("AlertDialog", () => {
	test("AlertDialogContent deve ter rounded-xl, shadow-md e respiro lateral (w-[calc(100%-2rem)])", () => {
		render(
			<AlertDialog open>
				<AlertDialogContent>
					<AlertDialogTitle>Confirmar</AlertDialogTitle>
					<AlertDialogDescription>Tem certeza?</AlertDialogDescription>
				</AlertDialogContent>
			</AlertDialog>,
		)
		const content = screen.getByRole("alertdialog")
		expect(content).toHaveClass("rounded-xl")
		expect(content).toHaveClass("shadow-md")
		expect(content).toHaveClass("w-[calc(100%-2rem)]")
	})
})
