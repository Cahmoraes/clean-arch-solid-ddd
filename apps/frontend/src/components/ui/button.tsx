"use client"

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { type ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/cn"

const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-2",
		"rounded-md",
		"font-medium leading-none",
		"cursor-pointer transition-colors",
		"disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
		"focus-ring-duplo",
		"[&_svg]:size-4 [&_svg]:shrink-0",
	].join(" "),
	{
		variants: {
			variant: {
				// Black Pill (CTA) — inverts to light in dark mode for contrast
				primary:
					"bg-primary text-primary-foreground border border-primary hover:bg-primary/90",
				// Gray Pill
				secondary:
					"bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/80",
				// Surface Pill
				outline:
					"bg-card text-card-foreground border border-border hover:bg-muted",
				ghost:
					"bg-transparent text-foreground border border-transparent hover:bg-muted",
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

/**
 * Quando `size="icon"` é usado sem filho textual visível, o consumidor DEVE
 * fornecer `aria-label` ou `aria-labelledby` para que o botão tenha nome
 * acessível (WCAG 4.1.2 / 2.5.3). Esta é uma decisão consciente: não há
 * enforcement de tipo para essa regra — ver PRD `acessibilidade-frontend`.
 */
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
