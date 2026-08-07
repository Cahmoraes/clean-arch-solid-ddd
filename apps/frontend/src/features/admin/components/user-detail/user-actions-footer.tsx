"use client"

import { Button } from "@/components/ui/button"
import { ACTION_ICON } from "@/components/ui/status-icon"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AdminUser } from "@/features/admin/api/use-users"
import { type ActionFlags, MoreActionsMenu } from "./more-actions-menu"
import type { UserDetailPermissions } from "./use-user-detail-actions"

const EditIcon = ACTION_ICON.edit

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
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							onClick={onEdit}
							disabled={flags.isPending}
							aria-label="Editar dados"
							className="bg-accent text-accent-foreground hover:bg-accent/90"
						>
							<EditIcon className="h-4 w-4" aria-hidden="true" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Editar dados</TooltipContent>
				</Tooltip>
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
