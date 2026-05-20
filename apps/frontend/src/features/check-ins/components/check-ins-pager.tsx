"use client"

import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"

interface CheckInsPagerProps {
	page: number
	pages: number
	onChange: (next: number) => void
	testId?: string
}

export function CheckInsPager({
	page,
	pages,
	onChange,
	testId = "checkins",
}: CheckInsPagerProps) {
	if (pages <= 1) return null
	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid={`${testId}-prev`}
						aria-disabled={page <= 1}
						onClick={(event) => {
							event.preventDefault()
							if (page > 1) onChange(page - 1)
						}}
					/>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink isActive>{page}</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext
						data-testid={`${testId}-next`}
						aria-disabled={page >= pages}
						onClick={(event) => {
							event.preventDefault()
							if (page < pages) onChange(page + 1)
						}}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}
