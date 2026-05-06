"use client"

import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"

export interface GymPaginationProps {
	page: number
	hasPrevious: boolean
	hasNext: boolean
	onPrevious: () => void
	onNext: () => void
}

export function GymPagination({
	page,
	hasPrevious,
	hasNext,
	onPrevious,
	onNext,
}: GymPaginationProps) {
	return (
		<Pagination data-testid="gym-pagination">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						href="#"
						aria-disabled={!hasPrevious}
						data-testid="gym-pagination-prev"
						onClick={(event) => {
							event.preventDefault()
							if (hasPrevious) onPrevious()
						}}
						className={
							!hasPrevious ? "pointer-events-none opacity-50" : undefined
						}
					/>
				</PaginationItem>
				<PaginationItem>
					<span
						data-testid="gym-pagination-page"
						className="px-3 text-sm text-muted-foreground"
					>
						Página {page}
					</span>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext
						href="#"
						aria-disabled={!hasNext}
						data-testid="gym-pagination-next"
						onClick={(event) => {
							event.preventDefault()
							if (hasNext) onNext()
						}}
						className={!hasNext ? "pointer-events-none opacity-50" : undefined}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}
