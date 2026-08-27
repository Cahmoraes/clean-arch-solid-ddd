import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, type = "text", ...props }, ref) => {
		return (
			<input
				ref={ref}
				type={type}
				className={cn(
					"flex h-10 w-full rounded-md border border-subtle bg-background px-4 py-2 text-base text-foreground",
					"placeholder:text-muted-foreground",
					"transition-colors",
					"focus-ring-duplo",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"file:border-0 file:bg-transparent file:text-sm file:font-medium",
					className,
				)}
				{...props}
			/>
		)
	},
)
Input.displayName = "Input"
