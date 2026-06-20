"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useActivateUser } from "@/features/admin/api/use-activate-user"
import { useDemoteFromAdmin } from "@/features/admin/api/use-demote-from-admin"
import { usePromoteToAdmin } from "@/features/admin/api/use-promote-to-admin"
import { useSuspendUser } from "@/features/admin/api/use-suspend-user"
import { useUpdateUser } from "@/features/admin/api/use-update-user"
import type { AdminUser } from "@/features/admin/api/use-users"
import { ApiError } from "@/lib/errors"
import type { UserDetailPermissions } from "./use-user-detail-actions"

interface DetailsEditFormProps {
	user: AdminUser
	permissions: UserDetailPermissions
	onCancel: () => void
	onSaved: () => void
}

function InlineFormError({ message }: { message: string | null }) {
	if (!message) return null
	return (
		<p
			role="alert"
			className="rounded-[8px] border border-transparent bg-destructive-soft px-3 py-2 text-sm text-destructive"
		>
			{message}
		</p>
	)
}

function toErrorMessage(err: unknown): string {
	if (err instanceof ApiError) return err.userMessage
	if (err instanceof Error) return err.message
	return "Não foi possível concluir a operação. Tente novamente."
}

type StatusValue = AdminUser["status"]
type RoleValue = AdminUser["role"]

export function DetailsEditForm({
	user,
	permissions,
	onCancel,
	onSaved,
}: DetailsEditFormProps) {
	const [name, setName] = useState(user.name)
	const [email, setEmail] = useState(user.email)
	const [status, setStatus] = useState<StatusValue>(user.status)
	const [role, setRole] = useState<RoleValue>(user.role)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const updateUser = useUpdateUser()
	const suspendUser = useSuspendUser()
	const activateUser = useActivateUser()
	const promoteToAdmin = usePromoteToAdmin()
	const demoteFromAdmin = useDemoteFromAdmin()

	const nameChanged = name !== user.name
	const emailChanged = email !== user.email
	const statusChanged = status !== user.status
	const roleChanged = role !== user.role

	const nothingChanged =
		!nameChanged && !emailChanged && !statusChanged && !roleChanged

	const isPending =
		updateUser.isPending ||
		suspendUser.isPending ||
		activateUser.isPending ||
		promoteToAdmin.isPending ||
		demoteFromAdmin.isPending

	async function handleSave() {
		setErrorMessage(null)
		try {
			// Sequencial e nesta ordem: promover exige usuário ativo, então o
			// status precisa ser persistido antes da mudança de role.
			if (permissions.canEditProfile && (nameChanged || emailChanged)) {
				await updateUser.mutateAsync({ userId: user.id, name, email })
			}

			if (permissions.canChangeStatus && statusChanged) {
				if (status === "suspended") {
					await suspendUser.mutateAsync(user.id)
				} else if (status === "activated") {
					await activateUser.mutateAsync(user.id)
				}
			}

			if (permissions.canChangeRole && roleChanged) {
				if (role === "ADMIN") {
					await promoteToAdmin.mutateAsync(user.id)
				} else if (role === "MEMBER") {
					await demoteFromAdmin.mutateAsync(user.id)
				}
			}

			onSaved()
		} catch (err) {
			setErrorMessage(toErrorMessage(err))
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<InlineFormError message={errorMessage} />

			{permissions.canEditProfile ? (
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="edit-name"
							className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
						>
							Nome
						</label>
						<Input
							id="edit-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={isPending}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="edit-email"
							className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
						>
							E-mail
						</label>
						<Input
							id="edit-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={isPending}
						/>
					</div>
				</div>
			) : null}

			{permissions.canChangeStatus ? (
				<div className="flex flex-col gap-1.5">
					<label
						htmlFor="edit-status"
						className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
					>
						Status
					</label>
					<select
						id="edit-status"
						className="h-10 rounded-md border border-input bg-background px-4 text-sm text-foreground"
						value={status === "locked" ? "suspended" : status}
						onChange={(e) => setStatus(e.target.value as StatusValue)}
						disabled={isPending}
					>
						<option value="activated">Ativo</option>
						<option value="suspended">Inativo</option>
					</select>
				</div>
			) : null}

			{permissions.canChangeRole ? (
				<div className="flex flex-col gap-1.5">
					<label
						htmlFor="edit-role"
						className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
					>
						Permissão
					</label>
					<select
						id="edit-role"
						className="h-10 rounded-md border border-input bg-background px-4 text-sm text-foreground"
						value={role}
						onChange={(e) => setRole(e.target.value as RoleValue)}
						disabled={isPending}
					>
						<option value="MEMBER">Membro</option>
						<option value="ADMIN">Admin</option>
					</select>
				</div>
			) : null}

			<div className="flex justify-end gap-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancelar
				</Button>
				<Button
					size="sm"
					onClick={handleSave}
					disabled={isPending || nothingChanged}
				>
					{isPending ? "Salvando..." : "Salvar alterações"}
				</Button>
			</div>
		</div>
	)
}
