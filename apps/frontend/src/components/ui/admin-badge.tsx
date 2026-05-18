import { Shield } from "lucide-react"
import { cn } from "@/lib/cn"

export function AdminBadge({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white",
				className,
			)}
		>
			<Shield className="h-3 w-3" />
			ADMIN
		</span>
	)
}
