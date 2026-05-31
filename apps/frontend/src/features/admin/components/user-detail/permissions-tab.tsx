import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/components/ui/role-badge"
import type { AdminUser } from "@/features/admin/api/use-users"

export interface PermissionsTabProps {
	user: AdminUser
	canPromoteToAdmin: boolean
	canDemoteFromAdmin: boolean
	isPending: boolean
	onPromote: () => void
	onDemote: () => void
}

function roleLabel(role: AdminUser["role"]): string {
	return role === "ADMIN" ? "Administrador" : "Membro"
}

function roleDescription(role: AdminUser["role"]): string {
	return role === "ADMIN"
		? "Acesso total ao painel — gerencia usuários e configurações."
		: "Acesso somente às próprias informações."
}

function PermissionsActions({
	canPromoteToAdmin,
	canDemoteFromAdmin,
	isPending,
	onPromote,
	onDemote,
}: Omit<PermissionsTabProps, "user">) {
	if (!canPromoteToAdmin && !canDemoteFromAdmin) return null
	return (
		<div className="flex flex-wrap gap-2">
			{canPromoteToAdmin ? (
				<Button
					onClick={onPromote}
					disabled={isPending}
					className="h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground hover:bg-primary-strong"
				>
					Tornar Administrador
				</Button>
			) : null}
			{canDemoteFromAdmin ? (
				<Button
					onClick={onDemote}
					disabled={isPending}
					className="h-11 rounded-md bg-destructive-soft px-4 font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
				>
					Remover Administrador
				</Button>
			) : null}
		</div>
	)
}

export function PermissionsTab({
	user,
	canPromoteToAdmin,
	canDemoteFromAdmin,
	isPending,
	onPromote,
	onDemote,
}: PermissionsTabProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
				<div className="flex flex-col gap-1">
					<span className="text-sm font-semibold text-card-foreground">
						{roleLabel(user.role)}
					</span>
					<span className="text-xs text-muted-foreground">
						{roleDescription(user.role)}
					</span>
				</div>
				<RoleBadge role={user.role} />
			</div>

			<PermissionsActions
				canPromoteToAdmin={canPromoteToAdmin}
				canDemoteFromAdmin={canDemoteFromAdmin}
				isPending={isPending}
				onPromote={onPromote}
				onDemote={onDemote}
			/>
		</div>
	)
}
