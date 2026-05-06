import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

/**
 * Pill-shaped input. White background, light-gray border, focus-ring blue.
 */
export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, type = "text", ...props }, ref) => {
		return (
			<input
				ref={ref}
				type={type}
				className={cn(
					"flex h-10 w-full rounded-full border border-border bg-background px-5 py-2 text-base text-foreground",
					"placeholder:text-silver",
					"transition-colors",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
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
