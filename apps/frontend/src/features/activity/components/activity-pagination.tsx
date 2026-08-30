import { NumberedPagination } from "@/components/ui/numbered-pagination"
import { cn } from "@/lib/cn"

export interface ActivityPaginationProps {
	page: number
	totalPages: number
	onChange: (page: number) => void
	testIdPrefix: string
	disabled?: boolean
	variant?: "default" | "accent"
	className?: string
}

export function ActivityPagination({
	page,
	totalPages,
	onChange,
	testIdPrefix,
	disabled = false,
	variant = "accent",
	className,
}: ActivityPaginationProps) {
	return (
		<NumberedPagination
			page={page}
			totalPages={totalPages}
			onChange={onChange}
			testIdPrefix={testIdPrefix}
			disabled={disabled}
			variant={variant}
			className={cn("mx-0 w-auto justify-end", className)}
		/>
	)
}
