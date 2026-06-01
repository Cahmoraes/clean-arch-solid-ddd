import { Search, X } from "lucide-react"

export interface CheckInSearchInputProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
}

export function CheckInSearchInput({
	value,
	onChange,
	placeholder,
}: CheckInSearchInputProps) {
	return (
		<div className="relative flex h-[52px] items-center rounded-md border border-border bg-surface px-4 gap-2">
			<Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="flex-1 bg-transparent text-foreground placeholder:text-subtle outline-none text-sm"
			/>
			{value && (
				<button
					type="button"
					aria-label="Limpar busca"
					onClick={() => onChange("")}
					className="shrink-0 text-subtle hover:text-foreground transition-colors"
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</button>
			)}
		</div>
	)
}
