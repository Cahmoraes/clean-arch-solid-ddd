import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { PlanStatusConfirmationDialog } from "./plan-status-confirmation-dialog"

describe("PlanStatusConfirmationDialog", () => {
	test("ação inactivate mostra título e descrição de inativação e chama onConfirm", () => {
		const onConfirm = vi.fn()
		renderWithProviders(
			<PlanStatusConfirmationDialog
				open
				action="inactivate"
				planName="Premium Mensal"
				isPending={false}
				onOpenChange={() => {}}
				onConfirm={onConfirm}
			/>,
		)

		expect(
			screen.getByRole("heading", { name: "Confirmar inativação" }),
		).toBeInTheDocument()
		fireEvent.click(
			screen.getByRole("button", { name: /confirmar inativação/i }),
		)
		expect(onConfirm).toHaveBeenCalledTimes(1)
	})

	test("ação reactivate mostra título de reativação", () => {
		renderWithProviders(
			<PlanStatusConfirmationDialog
				open
				action="reactivate"
				planName="Premium Mensal"
				isPending={false}
				onOpenChange={() => {}}
				onConfirm={() => {}}
			/>,
		)

		expect(
			screen.getByRole("heading", { name: "Confirmar reativação" }),
		).toBeInTheDocument()
	})
})
