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
import { Button } from "@/components/ui/button"

export interface SuspendConfirmationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isSuspending: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

export function SuspendConfirmationDialog({
	open,
	onOpenChange,
	isPending,
	isSuspending,
	onConfirm,
}: SuspendConfirmationDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar inativação</AlertDialogTitle>
					<AlertDialogDescription>
						Tem certeza que deseja inativar este usuário? Ele perderá o acesso
						aos recursos protegidos até ser reativado.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant="destructive"
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isSuspending}
						>
							{isSuspending ? "Inativando..." : "Confirmar inativação"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export interface PromoteConfirmationDialogProps {
	open: boolean
	userName: string
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isPromoting: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

export function PromoteConfirmationDialog({
	open,
	userName,
	onOpenChange,
	isPending,
	isPromoting,
	onConfirm,
}: PromoteConfirmationDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Tornar administrador?</AlertDialogTitle>
					<AlertDialogDescription>
						{userName} terá acesso total ao painel administrativo. Esta ação
						pode ser revertida.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isPromoting}
							className="bg-accent text-accent-foreground hover:bg-primary-strong"
						>
							{isPromoting ? "Promovendo..." : "Confirmar"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export interface DemoteConfirmationDialogProps {
	open: boolean
	userName: string
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isDemoting: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

export function DemoteConfirmationDialog({
	open,
	userName,
	onOpenChange,
	isPending,
	isDemoting,
	onConfirm,
}: DemoteConfirmationDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Remover privilégios de admin?</AlertDialogTitle>
					<AlertDialogDescription>
						{userName} perderá acesso ao painel administrativo e voltará a ser
						membro.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant="destructive"
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isDemoting}
						>
							{isDemoting ? "Removendo..." : "Remover"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
