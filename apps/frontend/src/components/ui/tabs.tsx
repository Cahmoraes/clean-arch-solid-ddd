"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"
import {
	type ComponentPropsWithoutRef,
	type ElementRef,
	forwardRef,
} from "react"
import { cn } from "@/lib/cn"

const Tabs = TabsPrimitive.Root

const TabsList = forwardRef<
	ElementRef<typeof TabsPrimitive.List>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.List
		ref={ref}
		className={cn(
			"flex w-full items-center justify-start gap-6 border-b border-border",
			className,
		)}
		{...props}
	/>
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = forwardRef<
	ElementRef<typeof TabsPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		className={cn(
			"-mb-px inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-0.5 py-2 font-display text-xl",
			"text-muted-foreground transition-colors hover:text-foreground",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
			"disabled:pointer-events-none disabled:opacity-50",
			"data-[state=active]:border-accent data-[state=active]:text-accent",
			className,
		)}
		{...props}
	/>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = forwardRef<
	ElementRef<typeof TabsPrimitive.Content>,
	ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		className={cn(
			"mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
			className,
		)}
		{...props}
	/>
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsContent, TabsList, TabsTrigger }
