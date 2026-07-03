"use client"

import { NumberedPagination } from "@/components/ui/numbered-pagination"

export interface GymPaginationProps {
	page: number
	totalPages: number
	onChange: (page: number) => void
}

export function GymPagination({
	page,
	totalPages,
	onChange,
}: GymPaginationProps) {
	return (
		<NumberedPagination
			testIdPrefix="gym-pagination"
			page={page}
			totalPages={totalPages}
			onChange={onChange}
		/>
	)
}
