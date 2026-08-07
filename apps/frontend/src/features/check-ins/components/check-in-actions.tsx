"use client"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ACTION_ICON } from "@/components/ui/status-icon"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
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

const ApproveIcon = ACTION_ICON.approve
const RejectIcon = ACTION_ICON.reject

function RejectButton({
	checkInId,
	onClick,
	isLoading,
	isPending,
}: RejectButtonProps) {
	const label = isPending ? "Rejeitando..." : "Rejeitar"
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClick}
					disabled={isLoading}
					aria-busy={isPending}
					aria-label={label}
					data-testid={`checkin-reject-${checkInId}`}
					className="bg-destructive-soft text-destructive hover:bg-destructive hover:text-destructive-foreground"
				>
					{isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
					) : (
						<RejectIcon className="h-4 w-4" aria-hidden="true" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
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
	const label = isPending ? "Aprovando..." : "Aprovar"
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClick}
					disabled={isLoading}
					aria-busy={isPending}
					aria-label={label}
					data-testid={`checkin-approve-${checkInId}`}
					className="bg-accent text-accent-foreground hover:bg-primary-strong"
				>
					{isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
					) : (
						<ApproveIcon className="h-4 w-4" aria-hidden="true" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
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
		<div className="flex gap-2 max-[560px]:flex-col">
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
			<div className="flex gap-2 max-[560px]:flex-col">
				<RejectButton
					checkInId={checkIn.id}
					onClick={handleReject}
					isLoading={isLoading}
					isPending={reject.isPending}
				/>
			</div>
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
