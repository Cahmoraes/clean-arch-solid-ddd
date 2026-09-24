import { Shield } from "@/components/ui/pixel-icons"
import { cn } from "@/lib/cn"

export function AdminBadge({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-0.5 font-display text-[15px] font-normal uppercase tracking-wide text-primary-foreground",
				className,
			)}
		>
			<Shield className="h-3 w-3" />
			ADMIN
		</span>
	)
}
