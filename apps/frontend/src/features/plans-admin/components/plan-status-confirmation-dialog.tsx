"use client"

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

export type PlanStatusAction = "inactivate" | "reactivate"

export interface PlanStatusConfirmationDialogProps {
	open: boolean
	action: PlanStatusAction
	planName: string
	isPending: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}

interface StatusActionConfig {
	title: string
	description: (planName: string) => string
	confirmLabel: string
	pendingLabel: string
	variant: ButtonProps["variant"]
}

const STATUS_ACTION_CONFIG: Record<PlanStatusAction, StatusActionConfig> = {
	inactivate: {
		title: "Confirmar inativação",
		description: (planName) =>
			`O plano "${planName}" deixará de aparecer na tela pública de assinaturas. Os dados do plano são mantidos e você pode reverter essa ação depois.`,
		confirmLabel: "Confirmar inativação",
		pendingLabel: "Inativando...",
		variant: "destructive",
	},
	reactivate: {
		title: "Confirmar reativação",
		description: (planName) =>
			`O plano "${planName}" voltará a aparecer na tela pública de assinaturas.`,
		confirmLabel: "Confirmar reativação",
		pendingLabel: "Reativando...",
		variant: "primary",
	},
}

export function PlanStatusConfirmationDialog({
	open,
	action,
	planName,
	isPending,
	onOpenChange,
	onConfirm,
}: PlanStatusConfirmationDialogProps) {
	const config = STATUS_ACTION_CONFIG[action]

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{config.title}</AlertDialogTitle>
					<AlertDialogDescription>
						{config.description(planName)}
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
