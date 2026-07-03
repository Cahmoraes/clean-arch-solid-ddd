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

interface NumberedPaginationProps {
	page: number
	totalPages: number
	onChange: (page: number) => void
	testIdPrefix: string
	className?: string
}

export function NumberedPagination({
	page,
	totalPages,
	onChange,
	testIdPrefix,
	className,
}: NumberedPaginationProps) {
	function handlePrev(event: MouseEvent) {
		event.preventDefault()
		if (page > 1) onChange(page - 1)
	}

	function handleNext(event: MouseEvent) {
		event.preventDefault()
		if (page < totalPages) onChange(page + 1)
	}

	function handleSelect(event: MouseEvent, target: number) {
		event.preventDefault()
		onChange(target)
	}

	return (
		<Pagination
			data-testid={`${testIdPrefix}-pagination`}
			className={className}
		>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid={`${testIdPrefix}-prev`}
						aria-disabled={page <= 1}
						onClick={handlePrev}
					/>
				</PaginationItem>
				{pageNumbers(page, totalPages).map((p) => (
					<PaginationItem key={p}>
						<PaginationLink
							data-testid={`${testIdPrefix}-page-${p}`}
							isActive={p === page}
							onClick={(event) => handleSelect(event, p)}
						>
							{p}
						</PaginationLink>
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext
						data-testid={`${testIdPrefix}-next`}
						aria-disabled={page >= totalPages}
						onClick={handleNext}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}
