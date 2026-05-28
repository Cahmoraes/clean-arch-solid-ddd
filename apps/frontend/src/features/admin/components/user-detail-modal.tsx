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
import { useDemoteFromAdmin } from "@/features/admin/api/use-demote-from-admin"
import { usePromoteToAdmin } from "@/features/admin/api/use-promote-to-admin"
import { useSuspendUser } from "@/features/admin/api/use-suspend-user"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"
import { cn } from "@/lib/cn"

const SUPER_ADMIN_EMAIL = "admin@admin.com"

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
	if (status === "locked") return "Bloqueado"
	return status
}

function statusBadgeClassName(status: string): string {
	if (status === "activated") {
		return "border-green-200 bg-green-50 text-green-700"
	}
	if (status === "suspended") {
		return "border-red-200 bg-red-50 text-red-700"
	}
	if (status === "locked") {
		return "border-amber-200 bg-amber-50 text-amber-700"
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

interface SectionLabelProps {
	children: ReactNode
}

function SectionLabel({ children }: SectionLabelProps) {
	return (
		<p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
			{children}
		</p>
	)
}

interface ActivateActionButtonProps {
	isPending: boolean
	isActivating: boolean
	unlockMode: boolean
	onActivate: () => void
}

function ActivateActionButton({
	isPending,
	isActivating,
	unlockMode,
	onActivate,
}: ActivateActionButtonProps) {
	const idleLabel = unlockMode ? "Desbloquear" : "Ativar"
	const busyLabel = unlockMode ? "Desbloqueando..." : "Ativando..."
	return (
		<Button
			onClick={onActivate}
			disabled={isPending}
			aria-busy={isActivating}
			className="bg-green-600 text-white hover:bg-green-700"
		>
			{isActivating ? busyLabel : idleLabel}
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
	unlockMode: boolean
	isPending: boolean
	isActivating: boolean
	isSuspending: boolean
	onActivate: () => void
	onOpenSuspendConfirm: () => void
}

function UserStatusActions({
	canActivate,
	canSuspend,
	unlockMode,
	isPending,
	isActivating,
	isSuspending,
	onActivate,
	onOpenSuspendConfirm,
}: UserStatusActionsProps) {
	if (!canActivate && !canSuspend) return null
	return (
		<div className="flex flex-col gap-2">
			<SectionLabel>Gerenciar Status</SectionLabel>
			<div className="flex flex-wrap gap-2">
				{canActivate ? (
					<ActivateActionButton
						isPending={isPending}
						isActivating={isActivating}
						unlockMode={unlockMode}
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
			</div>
		</div>
	)
}

interface PromoteToAdminButtonProps {
	isPending: boolean
	isPromoting: boolean
	onOpenPromoteConfirm: () => void
}

function PromoteToAdminButton({
	isPending,
	isPromoting,
	onOpenPromoteConfirm,
}: PromoteToAdminButtonProps) {
	return (
		<Button
			variant="outline"
			onClick={onOpenPromoteConfirm}
			disabled={isPending}
			aria-busy={isPromoting}
			className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
		>
			{isPromoting ? "Promovendo..." : "Tornar Administrador"}
		</Button>
	)
}

interface DemoteFromAdminButtonProps {
	isPending: boolean
	isDemoting: boolean
	onOpenDemoteConfirm: () => void
}

function DemoteFromAdminButton({
	isPending,
	isDemoting,
	onOpenDemoteConfirm,
}: DemoteFromAdminButtonProps) {
	return (
		<Button
			variant="outline"
			onClick={onOpenDemoteConfirm}
			disabled={isPending}
			aria-busy={isDemoting}
			className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
		>
			{isDemoting ? "Removendo..." : "Remover Administrador"}
		</Button>
	)
}

interface UserPermissionsActionsProps {
	canPromoteToAdmin: boolean
	canDemoteFromAdmin: boolean
	isPending: boolean
	isPromoting: boolean
	isDemoting: boolean
	onOpenPromoteConfirm: () => void
	onOpenDemoteConfirm: () => void
}

function UserPermissionsActions({
	canPromoteToAdmin,
	canDemoteFromAdmin,
	isPending,
	isPromoting,
	isDemoting,
	onOpenPromoteConfirm,
	onOpenDemoteConfirm,
}: UserPermissionsActionsProps) {
	if (!canPromoteToAdmin && !canDemoteFromAdmin) return null
	return (
		<div className="flex flex-col gap-2">
			<SectionLabel>Permissões</SectionLabel>
			<div className="flex flex-wrap gap-2">
				{canPromoteToAdmin ? (
					<PromoteToAdminButton
						isPending={isPending}
						isPromoting={isPromoting}
						onOpenPromoteConfirm={onOpenPromoteConfirm}
					/>
				) : null}
				{canDemoteFromAdmin ? (
					<DemoteFromAdminButton
						isPending={isPending}
						isDemoting={isDemoting}
						onOpenDemoteConfirm={onOpenDemoteConfirm}
					/>
				) : null}
			</div>
		</div>
	)
}

interface UserActionsSectionProps
	extends UserStatusActionsProps,
		UserPermissionsActionsProps {}

function UserActionsSection(props: UserActionsSectionProps) {
	const hasStatus = props.canActivate || props.canSuspend
	const hasPermissions = props.canPromoteToAdmin || props.canDemoteFromAdmin

	if (!hasStatus && !hasPermissions) return null

	return (
		<DialogFooter className="flex-col items-stretch gap-4 sm:flex-col">
			<UserStatusActions
				canActivate={props.canActivate}
				canSuspend={props.canSuspend}
				unlockMode={props.unlockMode}
				isPending={props.isPending}
				isActivating={props.isActivating}
				isSuspending={props.isSuspending}
				onActivate={props.onActivate}
				onOpenSuspendConfirm={props.onOpenSuspendConfirm}
			/>
			<UserPermissionsActions
				canPromoteToAdmin={props.canPromoteToAdmin}
				canDemoteFromAdmin={props.canDemoteFromAdmin}
				isPending={props.isPending}
				isPromoting={props.isPromoting}
				isDemoting={props.isDemoting}
				onOpenPromoteConfirm={props.onOpenPromoteConfirm}
				onOpenDemoteConfirm={props.onOpenDemoteConfirm}
			/>
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

interface PromoteConfirmationDialogProps {
	open: boolean
	userName: string
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isPromoting: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

function PromoteConfirmationDialog({
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
							className="bg-blue-600 text-white hover:bg-blue-700"
						>
							{isPromoting ? "Promovendo..." : "Confirmar"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

interface DemoteConfirmationDialogProps {
	open: boolean
	userName: string
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isDemoting: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

function DemoteConfirmationDialog({
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

function resolveErrorMessage({
	activateError,
	suspendError,
	promoteError,
	demoteError,
}: {
	activateError: string | null
	suspendError: string | null
	promoteError: string | null
	demoteError: string | null
}): string | null {
	return demoteError ?? promoteError ?? suspendError ?? activateError
}

function useUserPermissions(
	user: AdminUser,
	currentUserId: string | null | undefined,
) {
	const isLocked = user.status === "locked"
	const canSuspend =
		(user.status === "activated" || isLocked) &&
		user.role !== "ADMIN" &&
		currentUserId !== user.id
	const canActivate = user.status === "suspended" || isLocked
	const canPromoteToAdmin =
		user.status === "activated" &&
		user.role === "MEMBER" &&
		user.email !== SUPER_ADMIN_EMAIL
	const canDemoteFromAdmin =
		user.role === "ADMIN" &&
		currentUserId !== user.id &&
		user.email !== SUPER_ADMIN_EMAIL

	return {
		canSuspend,
		canActivate,
		canPromoteToAdmin,
		canDemoteFromAdmin,
		isLocked,
	}
}

interface UseUserMutationsReturn {
	activateUser: ReturnType<typeof useActivateUser>
	suspendUser: ReturnType<typeof useSuspendUser>
	promoteToAdmin: ReturnType<typeof usePromoteToAdmin>
	demoteFromAdmin: ReturnType<typeof useDemoteFromAdmin>
	isPending: boolean
	errorMessage: string | null
}

function getErrorMessage(mutation: {
	isError: boolean
	error?: { userMessage?: string } | null
}): string | null {
	return mutation.isError ? (mutation.error?.userMessage ?? null) : null
}

function useUserMutations(): UseUserMutationsReturn {
	const activateUser = useActivateUser()
	const suspendUser = useSuspendUser()
	const promoteToAdmin = usePromoteToAdmin()
	const demoteFromAdmin = useDemoteFromAdmin()

	const isPending =
		activateUser.isPending ||
		suspendUser.isPending ||
		promoteToAdmin.isPending ||
		demoteFromAdmin.isPending

	const errorMessage = resolveErrorMessage({
		activateError: getErrorMessage(activateUser),
		suspendError: getErrorMessage(suspendUser),
		promoteError: getErrorMessage(promoteToAdmin),
		demoteError: getErrorMessage(demoteFromAdmin),
	})

	return {
		activateUser,
		suspendUser,
		promoteToAdmin,
		demoteFromAdmin,
		isPending,
		errorMessage,
	}
}

export function UserDetailModal({ user, open, onClose }: UserDetailModalProps) {
	const currentUser = useAuthStore((state) => state.user)
	const mutations = useUserMutations()
	const permissions = useUserPermissions(user, currentUser?.id)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [promoteConfirmOpen, setPromoteConfirmOpen] = useState(false)
	const [demoteConfirmOpen, setDemoteConfirmOpen] = useState(false)

	useEffect(() => {
		if (!open) {
			setConfirmOpen(false)
			setPromoteConfirmOpen(false)
			setDemoteConfirmOpen(false)
		}
	}, [open])

	function handleDialogOpenChange(nextOpen: boolean) {
		if (nextOpen) return
		setConfirmOpen(false)
		setPromoteConfirmOpen(false)
		setDemoteConfirmOpen(false)
		onClose()
	}

	function handleActivate() {
		mutations.activateUser.mutate(user.id)
	}

	function handleConfirmSuspend(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		mutations.suspendUser.mutate(user.id, {
			onSuccess: () => setConfirmOpen(false),
			onError: () => setConfirmOpen(false),
		})
	}

	function handleConfirmPromote(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		mutations.promoteToAdmin.mutate(user.id, {
			onSuccess: () => setPromoteConfirmOpen(false),
			onError: () => setPromoteConfirmOpen(false),
		})
	}

	function handleConfirmDemote(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		mutations.demoteFromAdmin.mutate(user.id, {
			onSuccess: () => setDemoteConfirmOpen(false),
			onError: () => setDemoteConfirmOpen(false),
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
					<InlineError message={mutations.errorMessage} />
					<UserActionsSection
						canActivate={permissions.canActivate}
						canSuspend={permissions.canSuspend}
						unlockMode={permissions.isLocked}
						canPromoteToAdmin={permissions.canPromoteToAdmin}
						canDemoteFromAdmin={permissions.canDemoteFromAdmin}
						isPending={mutations.isPending}
						isActivating={mutations.activateUser.isPending}
						isSuspending={mutations.suspendUser.isPending}
						isPromoting={mutations.promoteToAdmin.isPending}
						isDemoting={mutations.demoteFromAdmin.isPending}
						onActivate={handleActivate}
						onOpenSuspendConfirm={() => setConfirmOpen(true)}
						onOpenPromoteConfirm={() => setPromoteConfirmOpen(true)}
						onOpenDemoteConfirm={() => setDemoteConfirmOpen(true)}
					/>
				</DialogContent>
			</Dialog>

			{confirmOpen ? (
				<SuspendConfirmationDialog
					open={confirmOpen}
					onOpenChange={setConfirmOpen}
					isPending={mutations.isPending}
					isSuspending={mutations.suspendUser.isPending}
					onConfirm={handleConfirmSuspend}
				/>
			) : null}

			{promoteConfirmOpen ? (
				<PromoteConfirmationDialog
					open={promoteConfirmOpen}
					userName={user.name}
					onOpenChange={setPromoteConfirmOpen}
					isPending={mutations.isPending}
					isPromoting={mutations.promoteToAdmin.isPending}
					onConfirm={handleConfirmPromote}
				/>
			) : null}

			{demoteConfirmOpen ? (
				<DemoteConfirmationDialog
					open={demoteConfirmOpen}
					userName={user.name}
					onOpenChange={setDemoteConfirmOpen}
					isPending={mutations.isPending}
					isDemoting={mutations.demoteFromAdmin.isPending}
					onConfirm={handleConfirmDemote}
				/>
			) : null}
		</>
	)
}
