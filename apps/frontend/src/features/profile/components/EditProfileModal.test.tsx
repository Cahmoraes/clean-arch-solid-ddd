import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { EditProfileModal } from "./EditProfileModal"

describe("EditProfileModal", () => {
	test("indica o campo Nome como obrigatório via aria-required e texto para leitor de tela", () => {
		renderWithProviders(
			<EditProfileModal
				open
				onOpenChange={vi.fn()}
				currentName="Maria Silva"
				hasPassword
			/>,
		)
		expect(screen.getByLabelText(/nome/i)).toHaveAttribute(
			"aria-required",
			"true",
		)
		expect(screen.getByText("(obrigatório)")).toBeInTheDocument()
		expect(screen.queryByText("*")).not.toBeInTheDocument()
	})
})
