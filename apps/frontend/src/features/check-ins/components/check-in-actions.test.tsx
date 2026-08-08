import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from "sonner"
import { useRejectCheckIn, useValidateCheckIn } from "@/features/check-ins/api"
import { ApiError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render"
import { CheckInActions } from "./check-in-actions.js"

vi.mock("@/features/check-ins/api", () => ({
	useValidateCheckIn: vi.fn(),
	useRejectCheckIn: vi.fn(),
}))

const makeMutation = (overrides: Record<string, unknown> = {}) => ({
	mutateAsync: vi.fn().mockResolvedValue(undefined),
	isPending: false,
	...overrides,
})

const pendingCheckIn = {
	id: "ci-1",
	gymId: "g-1",
	gymTitle: "Iron Gym",
	status: "pending" as const,
	validatedAt: null,
	rejectedAt: null,
	createdAt: "2024-01-01T10:00:00Z",
}

const validatedCheckIn = {
	...pendingCheckIn,
	id: "ci-2",
	status: "validated" as const,
	validatedAt: "2024-01-01T11:00:00Z",
}

const rejectedCheckIn = {
	...pendingCheckIn,
	id: "ci-3",
	status: "rejected" as const,
	rejectedAt: "2024-01-01T11:00:00Z",
}

describe("CheckInActions", () => {
	beforeEach(() => {
		vi.mocked(toast.success).mockClear()
		vi.mocked(toast.error).mockClear()
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation() as unknown as ReturnType<typeof useValidateCheckIn>,
		)
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation() as unknown as ReturnType<typeof useRejectCheckIn>,
		)
	})

	test("renders Aprovar and Rejeitar buttons for a pending check-in", () => {
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		expect(screen.getByTestId("checkin-approve-ci-1")).toBeInTheDocument()
		expect(screen.getByTestId("checkin-reject-ci-1")).toBeInTheDocument()
	})

	test("renders only Rejeitar button for a validated check-in", () => {
		renderWithProviders(<CheckInActions checkIn={validatedCheckIn} />)
		expect(screen.getByTestId("checkin-reject-ci-2")).toBeInTheDocument()
		expect(screen.queryByTestId("checkin-approve-ci-2")).not.toBeInTheDocument()
	})

	test("renders nothing for a rejected check-in", () => {
		const { container } = renderWithProviders(
			<CheckInActions checkIn={rejectedCheckIn} />,
		)
		expect(container).toBeEmptyDOMElement()
	})

	test("calls validate.mutateAsync and shows success toast on Aprovar click", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation({ mutateAsync }) as unknown as ReturnType<
				typeof useValidateCheckIn
			>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-approve-ci-1"))
		expect(mutateAsync).toHaveBeenCalledWith("ci-1")
		expect(toast.success).toHaveBeenCalledWith("Check-in aprovado com sucesso.")
	})

	test("calls reject.mutateAsync and shows success toast on Rejeitar click (pending)", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation({ mutateAsync }) as unknown as ReturnType<
				typeof useRejectCheckIn
			>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-reject-ci-1"))
		expect(mutateAsync).toHaveBeenCalledWith("ci-1")
		expect(toast.success).toHaveBeenCalledWith("Check-in rejeitado.")
	})

	test("calls reject.mutateAsync and shows success toast on Rejeitar click (validated)", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation({ mutateAsync }) as unknown as ReturnType<
				typeof useRejectCheckIn
			>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={validatedCheckIn} />)
		await user.click(screen.getByTestId("checkin-reject-ci-2"))
		expect(mutateAsync).toHaveBeenCalledWith("ci-2")
		expect(toast.success).toHaveBeenCalledWith("Check-in rejeitado.")
	})

	test("shows error toast with ApiError.userMessage when validate fails", async () => {
		const apiError = new ApiError(
			409,
			"already_validated",
			"Conflito ao processar a solicitação.",
		)
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation({
				mutateAsync: vi.fn().mockRejectedValue(apiError),
			}) as unknown as ReturnType<typeof useValidateCheckIn>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-approve-ci-1"))
		expect(toast.error).toHaveBeenCalledWith(
			"Conflito ao processar a solicitação.",
		)
	})

	test("shows fallback error toast when reject fails with unknown error", async () => {
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation({
				mutateAsync: vi.fn().mockRejectedValue(new Error("network")),
			}) as unknown as ReturnType<typeof useRejectCheckIn>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-reject-ci-1"))
		expect(toast.error).toHaveBeenCalledWith(
			"Não foi possível rejeitar o check-in.",
		)
	})

	test("FR-006: os botões usam o componente Button compartilhado, sem texto visível", () => {
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		const approveBtn = screen.getByTestId("checkin-approve-ci-1")
		const rejectBtn = screen.getByTestId("checkin-reject-ci-1")
		expect(within(approveBtn).queryByText("Aprovar")).not.toBeInTheDocument()
		expect(approveBtn).toHaveAttribute("aria-label", "Aprovar")
		expect(within(rejectBtn).queryByText("Rejeitar")).not.toBeInTheDocument()
		expect(rejectBtn).toHaveAttribute("aria-label", "Rejeitar")
	})

	test("FR-008: exibe tooltip no hover e no foco de teclado de cada botão", async () => {
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		const approveBtn = screen.getByTestId("checkin-approve-ci-1")

		await user.hover(approveBtn)
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Aprovar")
		await user.unhover(approveBtn)

		approveBtn.focus()
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Aprovar")
	})

	test("FR-008: exibe tooltip no hover e no foco de teclado do botão Rejeitar", async () => {
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		const rejectBtn = screen.getByTestId("checkin-reject-ci-1")

		await user.hover(rejectBtn)
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Rejeitar")
		await user.unhover(rejectBtn)

		rejectBtn.focus()
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Rejeitar")
	})

	test("aria-label do botão muda dinamicamente para 'Aprovando...'/'Rejeitando...' durante o estado pendente", () => {
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation({ isPending: true }) as unknown as ReturnType<
				typeof useValidateCheckIn
			>,
		)
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		const approveBtn = screen.getByTestId("checkin-approve-ci-1")
		const rejectBtn = screen.getByTestId("checkin-reject-ci-1")
		expect(approveBtn).toHaveAttribute("aria-label", "Aprovando...")
		expect(rejectBtn).toHaveAttribute("aria-label", "Rejeitar")
	})

	test("mostra um ícone de carregamento apenas no botão que está de fato pendente", () => {
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation({ isPending: true }) as unknown as ReturnType<
				typeof useValidateCheckIn
			>,
		)
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		const approveBtn = screen.getByTestId("checkin-approve-ci-1")
		const rejectBtn = screen.getByTestId("checkin-reject-ci-1")
		expect(
			(approveBtn as HTMLElement).querySelector(".animate-spin"),
		).toBeInTheDocument()
		expect(
			(rejectBtn as HTMLElement).querySelector(".animate-spin"),
		).not.toBeInTheDocument()
	})
})
