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

// Auxiliares de estado derivado
function hasNothingChanged(
	nameChanged: boolean,
	emailChanged: boolean,
	statusChanged: boolean,
	roleChanged: boolean,
): boolean {
	return !nameChanged && !emailChanged && !statusChanged && !roleChanged
}

// Auxiliares de salvamento sequencial (profile → status → role)
async function saveProfile(
	canEdit: boolean,
	changed: boolean,
	mutateAsync: (args: {
		userId: string
		name: string
		email: string
	}) => Promise<unknown>,
	userId: string,
	name: string,
	email: string,
): Promise<void> {
	if (canEdit && changed) {
		await mutateAsync({ userId, name, email })
	}
}

async function saveStatus(
	canChange: boolean,
	changed: boolean,
	status: StatusValue,
	suspendAsync: (id: string) => Promise<unknown>,
	activateAsync: (id: string) => Promise<unknown>,
	userId: string,
): Promise<void> {
	if (!canChange || !changed) return
	if (status === "suspended") await suspendAsync(userId)
	else if (status === "activated") await activateAsync(userId)
}

async function saveRole(
	canChange: boolean,
	changed: boolean,
	role: RoleValue,
	promoteAsync: (id: string) => Promise<unknown>,
	demoteAsync: (id: string) => Promise<unknown>,
	userId: string,
): Promise<void> {
	if (!canChange || !changed) return
	if (role === "ADMIN") await promoteAsync(userId)
	else if (role === "MEMBER") await demoteAsync(userId)
}

// Sub-componentes de campos do formulário
function ProfileFields({
	name,
	email,
	isPending,
	onNameChange,
	onEmailChange,
}: {
	name: string
	email: string
	isPending: boolean
	onNameChange: (v: string) => void
	onEmailChange: (v: string) => void
}) {
	return (
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
					onChange={(e) => onNameChange(e.target.value)}
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
					onChange={(e) => onEmailChange(e.target.value)}
					disabled={isPending}
				/>
			</div>
		</div>
	)
}

function StatusField({
	status,
	isPending,
	onChange,
}: {
	status: StatusValue
	isPending: boolean
	onChange: (v: StatusValue) => void
}) {
	return (
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
				onChange={(e) => onChange(e.target.value as StatusValue)}
				disabled={isPending}
			>
				<option value="activated">Ativo</option>
				<option value="suspended">Inativo</option>
			</select>
		</div>
	)
}

function RoleField({
	role,
	isPending,
	onChange,
}: {
	role: RoleValue
	isPending: boolean
	onChange: (v: RoleValue) => void
}) {
	return (
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
				onChange={(e) => onChange(e.target.value as RoleValue)}
				disabled={isPending}
			>
				<option value="MEMBER">Membro</option>
				<option value="ADMIN">Admin</option>
			</select>
		</div>
	)
}

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
	const nothingChanged = hasNothingChanged(
		nameChanged,
		emailChanged,
		statusChanged,
		roleChanged,
	)

	const isPending = [
		updateUser.isPending,
		suspendUser.isPending,
		activateUser.isPending,
		promoteToAdmin.isPending,
		demoteFromAdmin.isPending,
	].some(Boolean)

	async function handleSave() {
		setErrorMessage(null)
		try {
			// Sequencial e nesta ordem: promover exige usuário ativo, então o
			// status precisa ser persistido antes da mudança de role.
			await saveProfile(
				permissions.canEditProfile,
				nameChanged || emailChanged,
				updateUser.mutateAsync,
				user.id,
				name,
				email,
			)
			await saveStatus(
				permissions.canChangeStatus,
				statusChanged,
				status,
				suspendUser.mutateAsync,
				activateUser.mutateAsync,
				user.id,
			)
			await saveRole(
				permissions.canChangeRole,
				roleChanged,
				role,
				promoteToAdmin.mutateAsync,
				demoteFromAdmin.mutateAsync,
				user.id,
			)
			onSaved()
		} catch (err) {
			setErrorMessage(toErrorMessage(err))
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<InlineFormError message={errorMessage} />

			{permissions.canEditProfile && (
				<ProfileFields
					name={name}
					email={email}
					isPending={isPending}
					onNameChange={setName}
					onEmailChange={setEmail}
				/>
			)}

			{permissions.canChangeStatus && (
				<StatusField
					status={status}
					isPending={isPending}
					onChange={setStatus}
				/>
			)}

			{permissions.canChangeRole && (
				<RoleField role={role} isPending={isPending} onChange={setRole} />
			)}

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
