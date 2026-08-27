"use client"

import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import type * as React from "react"

import { cn } from "@/lib/cn"

function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<span className="inline-flex min-h-6 min-w-6 items-center justify-center">
			<CheckboxPrimitive.Root
				data-slot="checkbox"
				className={cn(
					"peer size-4 shrink-0 rounded-[4px] border border-subtle shadow-xs transition-shadow outline-none focus-ring-duplo disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary",
					className,
				)}
				{...props}
			>
				<CheckboxPrimitive.Indicator
					data-slot="checkbox-indicator"
					className="grid place-content-center text-current transition-none"
				>
					<CheckIcon className="size-3.5" aria-hidden="true" />
				</CheckboxPrimitive.Indicator>
			</CheckboxPrimitive.Root>
		</span>
	)
}

export { Checkbox }
