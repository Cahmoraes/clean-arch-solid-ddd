import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from "sonner"
import { useRejectCheckIn, useValidateCheckIn } from "@/features/check-ins/api"
import { ApiError } from "@/lib/errors"
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

	it("renders Aprovar and Rejeitar buttons for a pending check-in", () => {
		render(<CheckInActions checkIn={pendingCheckIn} />)
		expect(screen.getByTestId("checkin-approve-ci-1")).toBeInTheDocument()
		expect(screen.getByTestId("checkin-reject-ci-1")).toBeInTheDocument()
	})

	it("renders only Rejeitar button for a validated check-in", () => {
		render(<CheckInActions checkIn={validatedCheckIn} />)
		expect(screen.getByTestId("checkin-reject-ci-2")).toBeInTheDocument()
		expect(screen.queryByTestId("checkin-approve-ci-2")).not.toBeInTheDocument()
	})

	it("renders nothing for a rejected check-in", () => {
		const { container } = render(<CheckInActions checkIn={rejectedCheckIn} />)
		expect(container).toBeEmptyDOMElement()
	})

	it("calls validate.mutateAsync and shows success toast on Aprovar click", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation({ mutateAsync }) as unknown as ReturnType<
				typeof useValidateCheckIn
			>,
		)
		const user = userEvent.setup()
		render(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-approve-ci-1"))
		expect(mutateAsync).toHaveBeenCalledWith("ci-1")
		expect(toast.success).toHaveBeenCalledWith("Check-in aprovado com sucesso.")
	})

	it("calls reject.mutateAsync and shows success toast on Rejeitar click (pending)", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation({ mutateAsync }) as unknown as ReturnType<
				typeof useRejectCheckIn
			>,
		)
		const user = userEvent.setup()
		render(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-reject-ci-1"))
		expect(mutateAsync).toHaveBeenCalledWith("ci-1")
		expect(toast.success).toHaveBeenCalledWith("Check-in rejeitado.")
	})

	it("calls reject.mutateAsync and shows success toast on Rejeitar click (validated)", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation({ mutateAsync }) as unknown as ReturnType<
				typeof useRejectCheckIn
			>,
		)
		const user = userEvent.setup()
		render(<CheckInActions checkIn={validatedCheckIn} />)
		await user.click(screen.getByTestId("checkin-reject-ci-2"))
		expect(mutateAsync).toHaveBeenCalledWith("ci-2")
		expect(toast.success).toHaveBeenCalledWith("Check-in rejeitado.")
	})

	it("shows error toast with ApiError.userMessage when validate fails", async () => {
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
		render(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-approve-ci-1"))
		expect(toast.error).toHaveBeenCalledWith(
			"Conflito ao processar a solicitação.",
		)
	})

	it("shows fallback error toast when reject fails with unknown error", async () => {
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation({
				mutateAsync: vi.fn().mockRejectedValue(new Error("network")),
			}) as unknown as ReturnType<typeof useRejectCheckIn>,
		)
		const user = userEvent.setup()
		render(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-reject-ci-1"))
		expect(toast.error).toHaveBeenCalledWith(
			"Não foi possível rejeitar o check-in.",
		)
	})
})
