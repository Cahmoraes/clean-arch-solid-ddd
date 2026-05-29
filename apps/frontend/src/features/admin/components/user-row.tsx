import { MoreHorizontal } from "lucide-react"
import type { KeyboardEvent } from "react"
import { Avatar } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/ui/role-badge"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AdminUser } from "@/features/admin/api/use-users"
import { cn } from "@/lib/cn"

export interface UserRowProps {
	user: AdminUser
	onSelect?: (user: AdminUser) => void
	className?: string
}

type StatusTone = "success" | "warning" | "neutral"

function statusLabel(status: string): string {
	if (status === "activated") return "Ativo"
	if (status === "suspended") return "Inativo"
	if (status === "locked") return "Bloqueado"
	return status
}

function statusTone(status: string): StatusTone {
	if (status === "activated") return "success"
	if (status === "locked") return "warning"
	return "neutral"
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
				"flex w-full items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 text-left transition-[border-color] duration-300 ease-out",
				isInteractive && "cursor-pointer hover:border-border-strong",
				className,
			)}
		>
			<Avatar name={user.name} size="sm" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-[15.5px] font-semibold text-card-foreground">
					{user.name}
				</span>
				<span className="truncate font-mono text-[13px] text-subtle">
					{user.email}
				</span>
			</div>
			<RoleBadge role={user.role} />
			<StatusBadge tone={statusTone(user.status)}>
				{statusLabel(user.status)}
			</StatusBadge>
			<MoreHorizontal
				className="h-4 w-4 flex-shrink-0 text-subtle"
				aria-hidden="true"
			/>
		</li>
	)
}
