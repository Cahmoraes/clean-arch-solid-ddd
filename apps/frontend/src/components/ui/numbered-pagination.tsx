"use client"

import type { MouseEvent } from "react"
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"

function pageNumbers(currentPage: number, totalPages: number): number[] {
	if (totalPages <= 0) return []
	const max = Math.min(totalPages, 5)
	const start = Math.max(1, Math.min(currentPage - 2, totalPages - max + 1))
	return Array.from({ length: max }, (_, idx) => start + idx)
}

function isControlDisabled(disabled: boolean, atBoundary: boolean): boolean {
	return disabled || atBoundary
}

function controlTabIndex(
	disabled: boolean,
	atBoundary: boolean,
): number | undefined {
	return isControlDisabled(disabled, atBoundary) ? -1 : undefined
}

type NumberedPaginationVariant = "default" | "accent"

interface NumberedPaginationProps {
	page: number
	totalPages: number
	onChange: (page: number) => void
	testIdPrefix: string
	disabled?: boolean
	className?: string
	variant?: NumberedPaginationVariant
}

function pageLinkClassName(
	variant: NumberedPaginationVariant,
	isActive: boolean,
): string {
	if (variant !== "accent") return "h-8 w-8 text-sm"
	if (isActive) {
		return "h-8 w-8 rounded-sm border-transparent bg-accent text-sm font-semibold text-accent-foreground hover:bg-accent"
	}
	return "h-8 w-8 rounded-sm text-sm text-muted-foreground hover:text-foreground"
}

function navClassName(variant: NumberedPaginationVariant): string {
	if (variant !== "accent") return "h-8 w-8 text-sm"
	return "h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground"
}

export function NumberedPagination({
	page,
	totalPages,
	onChange,
	testIdPrefix,
	disabled = false,
	className,
	variant = "default",
}: NumberedPaginationProps) {
	function handlePrev(event: MouseEvent) {
		event.preventDefault()
		if (!disabled && page > 1) onChange(page - 1)
	}

	function handleNext(event: MouseEvent) {
		event.preventDefault()
		if (!disabled && page < totalPages) onChange(page + 1)
	}

	function handleSelect(event: MouseEvent, target: number) {
		event.preventDefault()
		if (!disabled) onChange(target)
	}

	return (
		<Pagination
			data-testid={`${testIdPrefix}-pagination`}
			className={className}
		>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						href="#"
						data-testid={`${testIdPrefix}-prev`}
						className={navClassName(variant)}
						iconClassName={variant === "accent" ? "h-3.5 w-3.5" : undefined}
						aria-disabled={isControlDisabled(disabled, page <= 1)}
						tabIndex={controlTabIndex(disabled, page <= 1)}
						onClick={handlePrev}
					/>
				</PaginationItem>
				{pageNumbers(page, totalPages).map((p) => (
					<PaginationItem key={p}>
						<PaginationLink
							href="#"
							data-testid={`${testIdPrefix}-page-${p}`}
							className={pageLinkClassName(variant, p === page)}
							isActive={p === page}
							aria-disabled={disabled}
							tabIndex={disabled ? -1 : undefined}
							onClick={(event) => handleSelect(event, p)}
						>
							{p}
						</PaginationLink>
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext
						href="#"
						data-testid={`${testIdPrefix}-next`}
						className={navClassName(variant)}
						iconClassName={variant === "accent" ? "h-3.5 w-3.5" : undefined}
						aria-disabled={isControlDisabled(disabled, page >= totalPages)}
						tabIndex={controlTabIndex(disabled, page >= totalPages)}
						onClick={handleNext}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}
