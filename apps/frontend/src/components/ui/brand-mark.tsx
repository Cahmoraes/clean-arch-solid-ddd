import { Zap } from "lucide-react"
import { cn } from "@/lib/cn"

export interface BrandMarkProps {
	/** Exibe o texto "VOLT" ao lado do ícone. Default: true. */
	wordmark?: boolean
	className?: string
}

export function BrandMark({ wordmark = true, className }: BrandMarkProps) {
	return (
		<span className={cn("inline-flex items-center gap-3", className)}>
			<span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
				<Zap className="h-4 w-4" fill="currentColor" aria-hidden="true" />
			</span>
			{wordmark && (
				<span className="font-display text-xl font-bold tracking-wide">
					VOLT
				</span>
			)}
		</span>
	)
}
