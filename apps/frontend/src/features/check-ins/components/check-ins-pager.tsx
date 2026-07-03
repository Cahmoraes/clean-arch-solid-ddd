"use client"

import { NumberedPagination } from "@/components/ui/numbered-pagination"

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
		<NumberedPagination
			page={page}
			totalPages={pages}
			onChange={onChange}
			testIdPrefix={testId}
		/>
	)
}
