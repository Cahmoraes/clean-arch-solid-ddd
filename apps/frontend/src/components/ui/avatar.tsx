import { cn } from "@/lib/cn"

const SIZE_CLASSES = {
	sm: "h-9 w-9 text-sm",
	md: "h-11 w-11 text-base",
	lg: "h-[88px] w-[88px] text-3xl",
} as const

export interface AvatarProps {
	name?: string
	size?: keyof typeof SIZE_CLASSES
	className?: string
}

function initials(name?: string): string {
	if (!name) return "?"
	const parts = name.split(" ").filter(Boolean)
	if (parts.length === 0) return "?"
	return parts
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-flex flex-shrink-0 items-center justify-center rounded-full bg-accent font-display font-bold text-accent-foreground",
				SIZE_CLASSES[size],
				className,
			)}
		>
			{initials(name)}
		</span>
	)
}
