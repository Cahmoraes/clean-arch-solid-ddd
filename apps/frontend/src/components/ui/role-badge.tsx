import { Shield } from "lucide-react"
import { cn } from "@/lib/cn"

export interface RoleBadgeProps {
	role: "ADMIN" | "MEMBER"
	className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
	const isAdmin = role === "ADMIN"
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-display text-[15px] font-normal",
				isAdmin
					? "border-primary/40 bg-primary/15 text-foreground"
					: "border-border bg-surface-2 text-muted-foreground",
				className,
			)}
		>
			{isAdmin && <Shield className="h-3 w-3" aria-hidden="true" />}
			{isAdmin ? "Admin" : "Membro"}
		</span>
	)
}
