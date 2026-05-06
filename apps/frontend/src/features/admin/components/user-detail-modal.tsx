"use client"

import { type MouseEvent, type ReactNode, useEffect, useState } from "react"
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { useActivateUser } from "@/features/admin/api/use-activate-user"
import { useSuspendUser } from "@/features/admin/api/use-suspend-user"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"
import { cn } from "@/lib/cn"

export interface UserDetailModalProps {
	user: AdminUser
	open: boolean
	onClose: () => void
}

function roleLabel(role: string): string {
	if (role === "ADMIN") return "Administrador"
	if (role === "MEMBER") return "Membro"
	return role
}

function statusLabel(status: string): string {
	if (status === "activated") return "Ativo"
	if (status === "suspended") return "Inativo"
	return status
}

function statusBadgeClassName(status: string): string {
	if (status === "activated") {
		return "border-green-200 bg-green-50 text-green-700"
	}
	if (status === "suspended") {
		return "border-red-200 bg-red-50 text-red-700"
	}
	return "border-border bg-muted text-muted-foreground"
}

function formatCreatedAt(iso: string): string {
	try {
		return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
			new Date(iso),
		)
	} catch {
		return iso
	}
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
				{label}
			</dt>
			<dd className="text-sm text-foreground">{value}</dd>
		</div>
	)
}

function UserDetailsList({ user }: { user: AdminUser }) {
	return (
		<dl className="grid gap-4 sm:grid-cols-2">
			<InfoItem label="Nome" value={user.name} />
			<InfoItem label="E-mail" value={user.email} />
			<InfoItem label="Papel" value={roleLabel(user.role)} />
			<InfoItem
				label="Status"
				value={
					<span
						className={cn(
							"inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium",
							statusBadgeClassName(user.status),
						)}
					>
						{statusLabel(user.status)}
					</span>
				}
			/>
			<InfoItem
				label="Data de cadastro"
				value={formatCreatedAt(user.createdAt)}
			/>
		</dl>
	)
}

function InlineError({ message }: { message: string | null }) {
	if (!message) return null

	return (
		<p
			role="alert"
			className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
		>
			{message}
		</p>
	)
}

interface ActivateActionButtonProps {
	isPending: boolean
	isActivating: boolean
	onActivate: () => void
}

function ActivateActionButton({
	isPending,
	isActivating,
	onActivate,
}: ActivateActionButtonProps) {
	return (
		<Button
			onClick={onActivate}
			disabled={isPending}
			aria-busy={isActivating}
			className="bg-green-600 text-white hover:bg-green-700"
		>
			{isActivating ? "Ativando..." : "Ativar"}
		</Button>
	)
}

interface SuspendActionButtonProps {
	isPending: boolean
	isSuspending: boolean
	onOpenSuspendConfirm: () => void
}

function SuspendActionButton({
	isPending,
	isSuspending,
	onOpenSuspendConfirm,
}: SuspendActionButtonProps) {
	return (
		<Button
			variant="destructive"
			onClick={onOpenSuspendConfirm}
			disabled={isPending}
			aria-busy={isSuspending}
		>
			{isSuspending ? "Inativando..." : "Inativar"}
		</Button>
	)
}

interface UserStatusActionsProps {
	canActivate: boolean
	canSuspend: boolean
	isPending: boolean
	isActivating: boolean
	isSuspending: boolean
	onActivate: () => void
	onOpenSuspendConfirm: () => void
}

function UserStatusActions({
	canActivate,
	canSuspend,
	isPending,
	isActivating,
	isSuspending,
	onActivate,
	onOpenSuspendConfirm,
}: UserStatusActionsProps) {
	if (!canActivate && !canSuspend) return null

	return (
		<DialogFooter>
			{canActivate ? (
				<ActivateActionButton
					isPending={isPending}
					isActivating={isActivating}
					onActivate={onActivate}
				/>
			) : null}
			{canSuspend ? (
				<SuspendActionButton
					isPending={isPending}
					isSuspending={isSuspending}
					onOpenSuspendConfirm={onOpenSuspendConfirm}
				/>
			) : null}
		</DialogFooter>
	)
}

interface SuspendConfirmationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isSuspending: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

function SuspendConfirmationDialog({
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

function resolveErrorMessage({
	activateError,
	suspendError,
}: {
	activateError: string | null
	suspendError: string | null
}): string | null {
	return suspendError ?? activateError
}

export function UserDetailModal({ user, open, onClose }: UserDetailModalProps) {
	const currentUser = useAuthStore((state) => state.user)
	const activateUser = useActivateUser()
	const suspendUser = useSuspendUser()
	const [confirmOpen, setConfirmOpen] = useState(false)

	useEffect(() => {
		if (!open) setConfirmOpen(false)
	}, [open])

	const canSuspend =
		user.status === "activated" &&
		user.role !== "ADMIN" &&
		currentUser?.id !== user.id
	const canActivate = user.status === "suspended"
	const isPending = activateUser.isPending || suspendUser.isPending
	const errorMessage = resolveErrorMessage({
		activateError: activateUser.isError
			? activateUser.error?.userMessage
			: null,
		suspendError: suspendUser.isError ? suspendUser.error?.userMessage : null,
	})

	function handleDialogOpenChange(nextOpen: boolean) {
		if (nextOpen) return
		setConfirmOpen(false)
		onClose()
	}

	function closeConfirmDialog() {
		setConfirmOpen(false)
	}

	function handleActivate() {
		activateUser.mutate(user.id)
	}

	function handleConfirmSuspend(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		suspendUser.mutate(user.id, {
			onSuccess: closeConfirmDialog,
			onError: closeConfirmDialog,
		})
	}

	return (
		<>
			<Dialog open={open} onOpenChange={handleDialogOpenChange}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Detalhes do usuário</DialogTitle>
						<DialogDescription>
							Visualize os dados da conta e altere o status quando permitido.
						</DialogDescription>
					</DialogHeader>

					<UserDetailsList user={user} />
					<InlineError message={errorMessage} />
					<UserStatusActions
						canActivate={canActivate}
						canSuspend={canSuspend}
						isPending={isPending}
						isActivating={activateUser.isPending}
						isSuspending={suspendUser.isPending}
						onActivate={handleActivate}
						onOpenSuspendConfirm={() => setConfirmOpen(true)}
					/>
				</DialogContent>
			</Dialog>

			{confirmOpen ? (
				<SuspendConfirmationDialog
					open={confirmOpen}
					onOpenChange={setConfirmOpen}
					isPending={isPending}
					isSuspending={suspendUser.isPending}
					onConfirm={handleConfirmSuspend}
				/>
			) : null}
		</>
	)
}
