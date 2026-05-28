import type { KeyboardEvent } from "react"
import type { AdminUser } from "@/features/admin/api/use-users"
import { cn } from "@/lib/cn"

export interface UserRowProps {
	user: AdminUser
	onSelect?: (user: AdminUser) => void
	className?: string
}

function roleLabel(role: string): string {
	if (role === "ADMIN") return "Administrador"
	if (role === "MEMBER") return "Membro"
	return role
}

function statusLabel(status: string): string {
	if (status === "activated") return "Ativo"
	if (status === "suspended") return "Inativo"
	if (status === "locked") return "Bloqueado"
	return status
}

function statusBadgeClassName(status: string): string {
	if (status === "activated") {
		return "border-green-200 bg-green-50 text-green-700"
	}
	if (status === "suspended") {
		return "border-red-200 bg-red-50 text-red-700"
	}
	if (status === "locked") {
		return "border-amber-200 bg-amber-50 text-amber-700"
	}
	return "border-border bg-card text-muted-foreground"
}

export function UserRow({ user, onSelect, className }: UserRowProps) {
	const isInteractive = typeof onSelect === "function"

	function handleSelect() {
		onSelect?.(user)
	}

	function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
		if (!isInteractive) return
		if (event.key !== "Enter" && event.key !== " ") return
		event.preventDefault()
		handleSelect()
	}

	return (
		<li
			data-testid={`user-row-${user.id}`}
			onClick={isInteractive ? handleSelect : undefined}
			onKeyDown={isInteractive ? handleKeyDown : undefined}
			role={isInteractive ? "button" : undefined}
			tabIndex={isInteractive ? 0 : undefined}
			className={cn(
				"flex flex-col gap-1 rounded-[12px] border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
				isInteractive && "cursor-pointer",
				className,
			)}
		>
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-card-foreground">{user.name}</span>
				<span className="text-sm text-muted-foreground">{user.email}</span>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<span
					data-testid={`user-row-${user.id}-role`}
					className="inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground"
				>
					{roleLabel(user.role)}
				</span>
				<span
					data-testid={`user-row-${user.id}-status`}
					className={cn(
						"inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium",
						statusBadgeClassName(user.status),
					)}
				>
					{statusLabel(user.status)}
				</span>
			</div>
		</li>
	)
}
