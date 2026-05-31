"use client"

import { Button } from "@/components/ui/button"
import type { AdminUser } from "@/features/admin/api/use-users"
import type { UserDetailPermissions } from "./use-user-detail-actions"

interface ActionFlags {
	isPending: boolean
	isActivating: boolean
	isSuspending: boolean
	isPromoting: boolean
	isDemoting: boolean
}

export interface UserActionsFooterProps {
	user: AdminUser
	permissions: UserDetailPermissions
	flags: ActionFlags
	onEdit: () => void
	onActivate: () => void
	onOpenSuspend: () => void
	onOpenPromote: () => void
	onOpenDemote: () => void
}

interface ContextualAction {
	key: string
	visible: boolean
	label: string
	onClick: () => void
	busy: boolean
	variant?: "outline"
	className: string
}

const OUTLINE_CLASS = "h-11 rounded-md px-4 font-semibold"
const SUSPEND_CLASS =
	"h-11 rounded-md bg-destructive-soft px-4 font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"

type ActionHandlers = Pick<
	UserActionsFooterProps,
	"onActivate" | "onOpenSuspend" | "onOpenPromote" | "onOpenDemote"
>

function buildContextualActions(
	permissions: UserDetailPermissions,
	flags: ActionFlags,
	handlers: ActionHandlers,
): ContextualAction[] {
	const activateLabel = permissions.isLocked ? "Desbloquear" : "Ativar"
	return [
		{
			key: "activate",
			visible: permissions.canActivate,
			label: flags.isActivating ? "Processando..." : activateLabel,
			onClick: handlers.onActivate,
			busy: flags.isActivating,
			variant: "outline",
			className: OUTLINE_CLASS,
		},
		{
			key: "suspend",
			visible: permissions.canSuspend,
			label: "Inativar",
			onClick: handlers.onOpenSuspend,
			busy: flags.isSuspending,
			className: SUSPEND_CLASS,
		},
		{
			key: "promote",
			visible: permissions.canPromoteToAdmin,
			label: "Tornar Admin",
			onClick: handlers.onOpenPromote,
			busy: flags.isPromoting,
			variant: "outline",
			className: OUTLINE_CLASS,
		},
		{
			key: "demote",
			visible: permissions.canDemoteFromAdmin,
			label: "Revogar Admin",
			onClick: handlers.onOpenDemote,
			busy: flags.isDemoting,
			variant: "outline",
			className: OUTLINE_CLASS,
		},
	]
}

function ContextualActions({
	actions,
	isPending,
}: {
	actions: ContextualAction[]
	isPending: boolean
}) {
	return (
		<>
			{actions
				.filter((action) => action.visible)
				.map((action) => (
					<Button
						key={action.key}
						onClick={action.onClick}
						disabled={isPending}
						aria-busy={action.busy}
						variant={action.variant}
						className={action.className}
					>
						{action.label}
					</Button>
				))}
		</>
	)
}

export function UserActionsFooter({
	permissions,
	flags,
	onEdit,
	onActivate,
	onOpenSuspend,
	onOpenPromote,
	onOpenDemote,
}: UserActionsFooterProps) {
	const actions = buildContextualActions(permissions, flags, {
		onActivate,
		onOpenSuspend,
		onOpenPromote,
		onOpenDemote,
	})
	return (
		<div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
			<Button
				onClick={onEdit}
				disabled={flags.isPending}
				className="h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground hover:bg-primary-strong"
			>
				Editar dados
			</Button>

			<ContextualActions actions={actions} isPending={flags.isPending} />

			<Button
				type="button"
				disabled
				title="Exclusão indisponível: endpoint não implementado"
				className="ml-auto h-11 rounded-md bg-destructive-soft px-4 font-semibold text-destructive opacity-60"
			>
				Excluir
			</Button>
		</div>
	)
}
