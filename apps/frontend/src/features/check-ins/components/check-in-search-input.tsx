import { Search, X } from "lucide-react"
import { cn } from "@/lib/cn"

export interface CheckInSearchInputProps {
	value: string
	onChange: (value: string) => void
	label: string
	placeholder?: string
	className?: string
}

export function CheckInSearchInput({
	value,
	onChange,
	label,
	placeholder,
	className,
}: CheckInSearchInputProps) {
	return (
		<div
			className={cn(
				"relative flex w-full h-13 items-center rounded-md border border-border bg-surface px-4 gap-2 focus-ring-duplo",
				className,
			)}
		>
			<Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				aria-label={label}
				className="flex-1 bg-transparent text-foreground placeholder:text-subtle text-sm outline-none focus-visible:outline-none focus-visible:shadow-none"
			/>
			{value && (
				<button
					type="button"
					aria-label="Limpar busca"
					onClick={() => onChange("")}
					className="inline-flex h-6 w-6 items-center justify-center shrink-0 text-subtle hover:text-foreground transition-colors"
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</button>
			)}
		</div>
	)
}
