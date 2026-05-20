"use client"

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { type ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/cn"

/**
 * Pill-shaped buttons aligned with DESIGN.md.
 * No shadows. Strict monochrome palette. Border-radius is always 9999px (pill).
 * Padding matches the design system spec: 10px 24px.
 */
const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-2",
		"rounded-full",
		"font-medium leading-none",
		"transition-colors",
		"disabled:pointer-events-none disabled:opacity-50",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
		"[&_svg]:size-4 [&_svg]:shrink-0",
	].join(" "),
	{
		variants: {
			variant: {
				// Default Pill (same as primary) — inverts to light in dark mode for contrast
				default:
					"bg-primary text-primary-foreground border border-primary hover:bg-primary/90",
				// Black Pill (CTA) — inverts to light in dark mode for contrast
				primary:
					"bg-primary text-primary-foreground border border-primary hover:bg-primary/90",
				// Gray Pill
				secondary:
					"bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/80",
				// Surface Pill
				outline:
					"bg-card text-card-foreground border border-border hover:bg-accent",
				ghost:
					"bg-transparent text-foreground border border-transparent hover:bg-accent",
				link: "bg-transparent text-foreground underline-offset-4 hover:underline border border-transparent px-0",
				destructive:
					"bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/90",
			},
			size: {
				sm: "h-8 px-4 text-sm",
				md: "h-10 px-6 text-base",
				lg: "h-12 px-8 text-lg",
				icon: "h-10 w-10 p-0",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
)

export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, type, ...props }, ref) => {
		const Comp = asChild ? Slot : "button"
		return (
			<Comp
				ref={ref}
				type={asChild ? undefined : (type ?? "button")}
				className={cn(buttonVariants({ variant, size }), className)}
				{...props}
			/>
		)
	},
)
Button.displayName = "Button"

export { buttonVariants }
