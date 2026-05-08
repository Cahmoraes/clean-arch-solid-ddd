"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { CheckIn } from "@/features/check-ins/api"
import { useRejectCheckIn, useValidateCheckIn } from "@/features/check-ins/api"
import { ApiError } from "@/lib/errors"

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError) return error.userMessage
	return fallback
}

interface CheckInActionsProps {
	checkIn: CheckIn
}

interface RejectButtonProps {
	checkInId: string
	onClick: () => Promise<void>
	isLoading: boolean
	isPending: boolean
}

function RejectButton({
	checkInId,
	onClick,
	isLoading,
	isPending,
}: RejectButtonProps) {
	return (
		<Button
			type="button"
			variant="destructive"
			size="sm"
			onClick={onClick}
			disabled={isLoading}
			aria-busy={isPending}
			data-testid={`checkin-reject-${checkInId}`}
		>
			{isPending ? "Rejeitando..." : "Rejeitar"}
		</Button>
	)
}

interface ApproveButtonProps {
	checkInId: string
	onClick: () => Promise<void>
	isLoading: boolean
	isPending: boolean
}

function ApproveButton({
	checkInId,
	onClick,
	isLoading,
	isPending,
}: ApproveButtonProps) {
	return (
		<Button
			type="button"
			size="sm"
			onClick={onClick}
			disabled={isLoading}
			aria-busy={isPending}
			data-testid={`checkin-approve-${checkInId}`}
		>
			{isPending ? "Aprovando..." : "Aprovar"}
		</Button>
	)
}

interface PendingActionsProps {
	checkInId: string
	onValidate: () => Promise<void>
	onReject: () => Promise<void>
	isLoading: boolean
	isValidating: boolean
	isRejecting: boolean
}

function PendingActions({
	checkInId,
	onValidate,
	onReject,
	isLoading,
	isValidating,
	isRejecting,
}: PendingActionsProps) {
	return (
		<div className="flex gap-2">
			<ApproveButton
				checkInId={checkInId}
				onClick={onValidate}
				isLoading={isLoading}
				isPending={isValidating}
			/>
			<RejectButton
				checkInId={checkInId}
				onClick={onReject}
				isLoading={isLoading}
				isPending={isRejecting}
			/>
		</div>
	)
}

export function CheckInActions({ checkIn }: CheckInActionsProps) {
	const validate = useValidateCheckIn()
	const reject = useRejectCheckIn()
	const isLoading = validate.isPending || reject.isPending

	async function handleValidate() {
		try {
			await validate.mutateAsync(checkIn.id)
			toast.success("Check-in aprovado com sucesso.")
		} catch (error) {
			toast.error(errorMessage(error, "Não foi possível aprovar o check-in."))
		}
	}

	async function handleReject() {
		try {
			await reject.mutateAsync(checkIn.id)
			toast.success("Check-in rejeitado.")
		} catch (error) {
			toast.error(errorMessage(error, "Não foi possível rejeitar o check-in."))
		}
	}

	if (checkIn.status === "validated") {
		return (
			<RejectButton
				checkInId={checkIn.id}
				onClick={handleReject}
				isLoading={isLoading}
				isPending={reject.isPending}
			/>
		)
	}

	if (checkIn.status === "pending") {
		return (
			<PendingActions
				checkInId={checkIn.id}
				onValidate={handleValidate}
				onReject={handleReject}
				isLoading={isLoading}
				isValidating={validate.isPending}
				isRejecting={reject.isPending}
			/>
		)
	}

	return null
}
