import type { AdminUser } from "@/features/admin/api/use-users"
import { cn } from "@/lib/cn"

export interface UserRowProps {
	user: AdminUser
	className?: string
}

function roleLabel(role: string): string {
	if (role === "ADMIN") return "Administrador"
	if (role === "MEMBER") return "Membro"
	return role
}

/**
 * UserRow — exibe os dados de um usuário na listagem admin.
 * Estilo monocromático, container radius 12px, sem sombras (DESIGN.md).
 */
export function UserRow({ user, className }: UserRowProps) {
	return (
		<li
			data-testid={`user-row-${user.id}`}
			className={cn(
				"flex flex-col gap-1 rounded-[12px] border border-light-gray bg-pure-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
		>
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-near-black">{user.name}</span>
				<span className="text-sm text-stone">{user.email}</span>
			</div>
			<span
				data-testid={`user-row-${user.id}-role`}
				className="inline-flex w-fit items-center rounded-full border border-light-gray px-2 py-0.5 text-xs font-medium text-mid-gray"
			>
				{roleLabel(user.role)}
			</span>
		</li>
	)
}
