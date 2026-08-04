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
import { Button } from "@/components/ui/button"

export type BulkStatusAction = "activate" | "deactivate"

export interface BulkStatusConfirmationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	action: BulkStatusAction
	count: number
	isPending: boolean
	onConfirm: () => void
}

function pluralUsers(count: number): string {
	return count === 1
		? "1 usuário selecionado"
		: `${count} usuários selecionados`
}

interface DialogContent {
	title: string
	description: string
	confirmLabel: string
	pendingLabel: string
}

function resolveDialogContent(
	action: BulkStatusAction,
	count: number,
): DialogContent {
	if (action === "activate") {
		return {
			title: "Confirmar ativação em massa",
			description: `Tem certeza que deseja ativar ${pluralUsers(count)}? Eles voltarão a ter acesso aos recursos protegidos.`,
			confirmLabel: "Confirmar ativação",
			pendingLabel: "Ativando...",
		}
	}
	return {
		title: "Confirmar desativação em massa",
		description: `Tem certeza que deseja desativar ${pluralUsers(count)}? Eles perderão o acesso aos recursos protegidos até serem reativados.`,
		confirmLabel: "Confirmar desativação",
		pendingLabel: "Desativando...",
	}
}

export function BulkStatusConfirmationDialog({
	open,
	onOpenChange,
	action,
	count,
	isPending,
	onConfirm,
}: BulkStatusConfirmationDialogProps) {
	const content = resolveDialogContent(action, count)

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{content.title}</AlertDialogTitle>
					<AlertDialogDescription>{content.description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant={action === "deactivate" ? "destructive" : undefined}
							className={
								action === "activate"
									? "bg-accent text-accent-foreground hover:bg-primary-strong"
									: undefined
							}
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isPending}
						>
							{isPending ? content.pendingLabel : content.confirmLabel}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
