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
			"inline-flex h-10 items-center justify-center gap-1 rounded-full bg-snow p-1 border border-light-gray",
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
			"inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium",
			"text-stone transition-colors",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
			"disabled:pointer-events-none disabled:opacity-50",
			"data-[state=active]:bg-light-gray data-[state=active]:text-near-black",
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
