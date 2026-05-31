"use client"

import { Avatar } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/ui/role-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AdminUser } from "@/features/admin/api/use-users"
import { cn } from "@/lib/cn"
import { ActivityTab } from "./activity-tab"
import {
	DeleteConfirmationDialog,
	DemoteConfirmationDialog,
	PromoteConfirmationDialog,
	SuspendConfirmationDialog,
} from "./confirmation-dialogs"
import { DetailsTab } from "./details-tab"
import { PermissionsTab } from "./permissions-tab"
import type { UserDetailActions } from "./use-user-detail-actions"
import { useUserDetailActions } from "./use-user-detail-actions"
import { UserActionsFooter } from "./user-actions-footer"
import { statusBadgeClassName, statusLabel } from "./user-detail-format"

export interface UserDetailPanelProps {
	user: AdminUser
	onEdit: () => void
	onClose?: () => void
}

function InlineError({ message }: { message: string | null }) {
	if (!message) return null
	return (
		<p
			role="alert"
			className="rounded-[12px] border border-transparent bg-destructive-soft px-4 py-3 text-sm text-destructive"
		>
			{message}
		</p>
	)
}

function UserIdentityHeader({ user }: { user: AdminUser }) {
	return (
		<header className="flex items-start gap-3">
			<Avatar name={user.name} size="lg" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="text-lg font-semibold text-foreground">
					{user.name}
				</span>
				<span className="truncate font-mono text-sm text-muted-foreground">
					{user.email}
				</span>
				<div className="flex flex-wrap gap-2 pt-1">
					<span
						className={cn(
							"inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium",
							statusBadgeClassName(user.status),
						)}
					>
						{statusLabel(user.status)}
					</span>
					<RoleBadge role={user.role} />
				</div>
			</div>
		</header>
	)
}

function UserDetailTabs({
	user,
	actions,
}: {
	user: AdminUser
	actions: UserDetailActions
}) {
	return (
		<Tabs defaultValue="detalhes" className="flex flex-col gap-4">
			<TabsList>
				<TabsTrigger value="detalhes">Detalhes</TabsTrigger>
				<TabsTrigger value="permissoes">Permissões</TabsTrigger>
				<TabsTrigger value="atividade">Atividade</TabsTrigger>
			</TabsList>
			<TabsContent value="detalhes">
				<DetailsTab user={user} />
			</TabsContent>
			<TabsContent value="permissoes">
				<PermissionsTab
					user={user}
					canPromoteToAdmin={actions.permissions.canPromoteToAdmin}
					canDemoteFromAdmin={actions.permissions.canDemoteFromAdmin}
					isPending={actions.flags.isPending}
					onPromote={() => actions.confirm.setPromoteOpen(true)}
					onDemote={() => actions.confirm.setDemoteOpen(true)}
				/>
			</TabsContent>
			<TabsContent value="atividade">
				<ActivityTab />
			</TabsContent>
		</Tabs>
	)
}

function ConfirmationDialogs({
	user,
	actions,
}: {
	user: AdminUser
	actions: UserDetailActions
}) {
	return (
		<>
			{actions.confirm.suspendOpen ? (
				<SuspendConfirmationDialog
					open={actions.confirm.suspendOpen}
					onOpenChange={actions.confirm.setSuspendOpen}
					isPending={actions.flags.isPending}
					isSuspending={actions.flags.isSuspending}
					onConfirm={actions.onConfirmSuspend}
				/>
			) : null}
			{actions.confirm.promoteOpen ? (
				<PromoteConfirmationDialog
					open={actions.confirm.promoteOpen}
					userName={user.name}
					onOpenChange={actions.confirm.setPromoteOpen}
					isPending={actions.flags.isPending}
					isPromoting={actions.flags.isPromoting}
					onConfirm={actions.onConfirmPromote}
				/>
			) : null}
			{actions.confirm.demoteOpen ? (
				<DemoteConfirmationDialog
					open={actions.confirm.demoteOpen}
					userName={user.name}
					onOpenChange={actions.confirm.setDemoteOpen}
					isPending={actions.flags.isPending}
					isDemoting={actions.flags.isDemoting}
					onConfirm={actions.onConfirmDemote}
				/>
			) : null}
			{actions.confirm.deleteOpen ? (
				<DeleteConfirmationDialog
					open={actions.confirm.deleteOpen}
					userName={user.name}
					onOpenChange={actions.confirm.setDeleteOpen}
					isPending={actions.flags.isPending}
					isDeleting={actions.flags.isDeleting}
					onConfirm={actions.onConfirmDelete}
				/>
			) : null}
		</>
	)
}

export function UserDetailPanel({
	user,
	onEdit,
	onClose,
}: UserDetailPanelProps) {
	const actions = useUserDetailActions(user, { onDeleteSuccess: onClose })

	return (
		<div className="flex flex-col gap-4">
			<UserIdentityHeader user={user} />
			<InlineError message={actions.errorMessage} />
			<UserDetailTabs user={user} actions={actions} />
			<UserActionsFooter
				user={user}
				permissions={actions.permissions}
				flags={actions.flags}
				onEdit={onEdit}
				onActivate={actions.onActivate}
				onOpenSuspend={() => actions.confirm.setSuspendOpen(true)}
				onOpenPromote={() => actions.confirm.setPromoteOpen(true)}
				onOpenDemote={() => actions.confirm.setDemoteOpen(true)}
				onOpenDelete={() => actions.confirm.setDeleteOpen(true)}
			/>
			<ConfirmationDialogs user={user} actions={actions} />
		</div>
	)
}
