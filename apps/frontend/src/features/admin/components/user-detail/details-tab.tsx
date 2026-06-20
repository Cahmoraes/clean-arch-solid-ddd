"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/components/ui/role-badge"
import type { AdminUser } from "@/features/admin/api/use-users"
import { cn } from "@/lib/cn"
import { DetailsEditForm } from "./details-edit-form"
import type { UserDetailPermissions } from "./use-user-detail-actions"
import {
	formatCreatedAt,
	statusBadgeClassName,
	statusLabel,
} from "./user-detail-format"

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

function canEditAnything(permissions: UserDetailPermissions): boolean {
	return (
		permissions.canEditProfile ||
		permissions.canChangeStatus ||
		permissions.canChangeRole
	)
}

export function DetailsTab({
	user,
	permissions,
}: {
	user: AdminUser
	permissions: UserDetailPermissions
}) {
	const [editing, setEditing] = useState(false)

	if (editing) {
		return (
			<DetailsEditForm
				user={user}
				permissions={permissions}
				onCancel={() => setEditing(false)}
				onSaved={() => setEditing(false)}
			/>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			{canEditAnything(permissions) ? (
				<div className="flex justify-end">
					<Button variant="outline" size="sm" onClick={() => setEditing(true)}>
						Editar
					</Button>
				</div>
			) : null}
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
				<InfoItem label="Permissão" value={<RoleBadge role={user.role} />} />
				<InfoItem
					label="Membro desde"
					value={formatCreatedAt(user.createdAt)}
				/>
				<InfoItem label="Último acesso" value="Sem registro" />
			</dl>
		</div>
	)
}
