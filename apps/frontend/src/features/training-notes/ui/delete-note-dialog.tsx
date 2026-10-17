"use client"

import { toast } from "sonner"
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
import { useDeleteNote } from "../api/use-training-notes"
import { formatarDataCurta, mensagemDeFalha } from "../lib/note-messages"

export interface DeleteNoteDialogProps {
	open: boolean
	date: string | null
	onOpenChange: (open: boolean) => void
	onDeleted: () => void
}

export function DeleteNoteDialog({
	open,
	date,
	onOpenChange,
	onDeleted,
}: DeleteNoteDialogProps) {
	const deleteNote = useDeleteNote()

	async function excluir(dia: string): Promise<void> {
		try {
			await deleteNote.mutateAsync({ data: dia })
		} catch (error) {
			toast.error(mensagemDeFalha(error))
			return
		}
		toast.success("Nota excluída.")
		onOpenChange(false)
		onDeleted()
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			{date ? (
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir a nota?</AlertDialogTitle>
						<AlertDialogDescription>
							A nota de {formatarDataCurta(date)} será apagada e sairá da célula
							e da lista. Essa ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault()
								void excluir(date)
							}}
						>
							Confirmar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			) : null}
		</AlertDialog>
	)
}
