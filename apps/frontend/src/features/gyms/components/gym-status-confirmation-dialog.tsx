"use client"

import type { MouseEvent } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, type ButtonProps } from "@/components/ui/button"

export type GymStatusAction = "deactivate" | "activate"

export interface GymStatusConfirmationDialogProps {
	open: boolean
	action: GymStatusAction
	gymTitle: string
	isPending: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

interface StatusActionConfig {
	title: string
	description: (gymTitle: string) => string
	confirmLabel: string
	pendingLabel: string
	variant: ButtonProps["variant"]
}

const STATUS_ACTION_CONFIG: Record<GymStatusAction, StatusActionConfig> = {
	deactivate: {
		title: "Confirmar desativação",
		description: (gymTitle) =>
			`A academia "${gymTitle}" deixará de aparecer nas buscas e não será mais possível fazer check-in nela. Os check-ins e dados já registrados são mantidos. Você pode reverter essa ação depois.`,
		confirmLabel: "Confirmar desativação",
		pendingLabel: "Desativando...",
		variant: "destructive",
	},
	activate: {
		title: "Confirmar reativação",
		description: (gymTitle) =>
			`A academia "${gymTitle}" voltará a aparecer nas buscas e será possível fazer check-in nela novamente.`,
		confirmLabel: "Confirmar reativação",
		pendingLabel: "Reativando...",
		variant: "primary",
	},
}

export function GymStatusConfirmationDialog({
	open,
	action,
	gymTitle,
	isPending,
	onOpenChange,
	onConfirm,
}: GymStatusConfirmationDialogProps) {
	const config = STATUS_ACTION_CONFIG[action]

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{config.title}</AlertDialogTitle>
					<AlertDialogDescription>
						{config.description(gymTitle)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant={config.variant}
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isPending}
						>
							{isPending ? config.pendingLabel : config.confirmLabel}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
