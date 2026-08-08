"use client"

import type { ReactNode } from "react"
import { RoleBadge } from "@/components/ui/role-badge"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AdminUser } from "@/features/admin/api/use-users"
import { DetailsEditForm } from "./details-edit-form"
import type { UserDetailPermissions } from "./use-user-detail-actions"
import { formatCreatedAt, statusLabel, statusTone } from "./user-detail-format"

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

export function DetailsTab({
	user,
	permissions,
	editing,
	onStopEdit,
}: {
	user: AdminUser
	permissions: UserDetailPermissions
	editing: boolean
	onStopEdit: () => void
}) {
	if (editing) {
		return (
			<DetailsEditForm
				user={user}
				permissions={permissions}
				onCancel={onStopEdit}
				onSaved={onStopEdit}
			/>
		)
	}

	return (
		<dl className="grid gap-4 sm:grid-cols-2">
			<InfoItem label="Nome" value={user.name} />
			<InfoItem label="E-mail" value={user.email} />
			<InfoItem
				label="User ID"
				value={<span className="font-mono text-xs">{user.id}</span>}
			/>
			<InfoItem
				label="Status"
				value={
					<StatusBadge tone={statusTone(user.status)}>
						{statusLabel(user.status)}
					</StatusBadge>
				}
			/>
			<InfoItem label="Permissão" value={<RoleBadge role={user.role} />} />
			<InfoItem label="Membro desde" value={formatCreatedAt(user.createdAt)} />
			<InfoItem label="Último acesso" value="Sem registro" />
		</dl>
	)
}
