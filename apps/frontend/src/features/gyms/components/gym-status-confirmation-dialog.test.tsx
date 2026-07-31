import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { GymStatusConfirmationDialog } from "./gym-status-confirmation-dialog"

describe("GymStatusConfirmationDialog", () => {
	test("modo 'deactivate' exibe título e descrição de desativação", () => {
		renderWithProviders(
			<GymStatusConfirmationDialog
				open
				action="deactivate"
				gymTitle="Iron Gym"
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		expect(
			screen.getByRole("heading", { name: "Confirmar desativação" }),
		).toBeInTheDocument()
		expect(
			screen.getByText(/Iron Gym.*deixará de aparecer nas buscas/i),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Confirmar desativação" }),
		).toBeInTheDocument()
	})

	test("modo 'activate' exibe título e descrição de reativação", () => {
		renderWithProviders(
			<GymStatusConfirmationDialog
				open
				action="activate"
				gymTitle="Iron Gym"
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		expect(
			screen.getByRole("heading", { name: "Confirmar reativação" }),
		).toBeInTheDocument()
		expect(
			screen.getByText(/Iron Gym.*voltará a aparecer nas buscas/i),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Confirmar reativação" }),
		).toBeInTheDocument()
	})

	test("durante isPending, botão ação troca label → fica disabled", () => {
		renderWithProviders(
			<GymStatusConfirmationDialog
				open
				action="deactivate"
				gymTitle="Iron Gym"
				isPending
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		const actionButton = screen.getByRole("button", { name: "Desativando..." })
		expect(actionButton).toBeDisabled()
	})

	test("click botão ação chama onConfirm 1x", async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		renderWithProviders(
			<GymStatusConfirmationDialog
				open
				action="activate"
				gymTitle="Iron Gym"
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={onConfirm}
			/>,
		)

		await user.click(
			screen.getByRole("button", { name: "Confirmar reativação" }),
		)

		expect(onConfirm).toHaveBeenCalledTimes(1)
	})
})
