"use client"

import { Button } from "@/components/ui/button"
import type { AdminUser } from "@/features/admin/api/use-users"
import { type ActionFlags, MoreActionsMenu } from "./more-actions-menu"
import type { UserDetailPermissions } from "./use-user-detail-actions"

export interface UserActionsFooterProps {
	user: AdminUser
	permissions: UserDetailPermissions
	flags: ActionFlags
	canEdit: boolean
	onEdit: () => void
	onActivate: () => void
	onOpenSuspend: () => void
	onOpenPromote: () => void
	onOpenDemote: () => void
	onOpenDelete: () => void
}

export function UserActionsFooter({
	permissions,
	flags,
	canEdit,
	onEdit,
	onActivate,
	onOpenSuspend,
	onOpenPromote,
	onOpenDemote,
	onOpenDelete,
}: UserActionsFooterProps) {
	return (
		<div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
			{canEdit ? (
				<Button
					onClick={onEdit}
					disabled={flags.isPending}
					className="h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground hover:bg-accent/90"
				>
					Editar dados
				</Button>
			) : null}
			<MoreActionsMenu
				permissions={permissions}
				flags={flags}
				onActivate={onActivate}
				onOpenSuspend={onOpenSuspend}
				onOpenPromote={onOpenPromote}
				onOpenDemote={onOpenDemote}
				onOpenDelete={onOpenDelete}
			/>
		</div>
	)
}
