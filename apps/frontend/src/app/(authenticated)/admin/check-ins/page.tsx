"use client"

import { ShieldCheck } from "lucide-react"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
	CHECK_INS_DEFAULT_PAGE_SIZE,
	type CheckIn,
	useCheckIns,
} from "@/features/check-ins/api"
import { CheckInActions } from "@/features/check-ins/components/check-in-actions"
import { CheckInFilterBar } from "@/features/check-ins/components/check-in-filter-bar"
import { CheckInItem } from "@/features/check-ins/components/check-in-item"
import {
	type CheckInFilterStatus,
	useCheckInFilters,
} from "@/features/check-ins/hooks/use-check-in-filters"

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3"]

function LoadingState() {
	return (
		<ul
			data-testid="admin-checkins-skeleton"
			aria-label="Carregando check-ins"
			className="flex flex-col gap-2"
		>
			{SKELETON_KEYS.map((key) => (
				<li key={key}>
					<Skeleton className="h-16 w-full rounded-[12px]" />
				</li>
			))}
		</ul>
	)
}

function totalPages(total: number, pageSize: number): number {
	if (total <= 0) return 0
	return Math.max(1, Math.ceil(total / pageSize))
}

interface PagerProps {
	page: number
	pages: number
	onChange: (next: number) => void
}

function AdminCheckInsPager({ page, pages, onChange }: PagerProps) {
	if (pages <= 1) return null
	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid="admin-checkins-prev"
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
						data-testid="admin-checkins-next"
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

const STATUS_LABELS: Record<NonNullable<CheckInFilterStatus>, string> = {
	pending: "pendente",
	validated: "aprovado",
	rejected: "rejeitado",
}

function AdminCheckInsEmpty({ status }: { status: CheckInFilterStatus }) {
	if (!status) {
		return (
			<EmptyState
				icon={ShieldCheck}
				title="Nenhum check-in encontrado"
				description="Ainda não há check-ins registrados."
			/>
		)
	}
	return (
		<EmptyState
			icon={ShieldCheck}
			title={`Nenhum check-in ${STATUS_LABELS[status]} encontrado`}
			description="Tente selecionar outro filtro."
		/>
	)
}

function AdminCheckInList({ items }: { items: ReadonlyArray<CheckIn> }) {
	return (
		<ul data-testid="admin-checkins-list" className="flex flex-col gap-2">
			{items.map((checkIn) => (
				<CheckInItem
					key={checkIn.id}
					checkIn={checkIn}
					action={<CheckInActions checkIn={checkIn} />}
				/>
			))}
		</ul>
	)
}

interface BodyProps {
	query: ReturnType<typeof useCheckIns>
	status: CheckInFilterStatus
}

function AdminCheckInsError({ query }: Pick<BodyProps, "query">) {
	return (
		<EmptyState
			title="Não foi possível carregar os check-ins"
			description={query.error?.userMessage}
			action={
				<Button
					variant="outline"
					onClick={() => query.refetch()}
					data-testid="admin-checkins-retry"
				>
					Tentar novamente
				</Button>
			}
		/>
	)
}

function AdminCheckInsBody({ query, status }: BodyProps) {
	if (query.isLoading) return <LoadingState />
	if (query.isError) return <AdminCheckInsError query={query} />
	if (!query.isSuccess) return null
	const items = query.data?.items ?? []
	if (items.length === 0) return <AdminCheckInsEmpty status={status} />
	return <AdminCheckInList items={items} />
}

function AdminCheckInsPageContent() {
	const { status, page, setStatus, setPage } = useCheckInFilters()
	const query = useCheckIns({ page, status })
	const pages = totalPages(query.data?.total ?? 0, CHECK_INS_DEFAULT_PAGE_SIZE)

	return (
		<section
			aria-labelledby="admin-checkins-title"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
			<header className="flex flex-col gap-1">
				<h1
					id="admin-checkins-title"
					className="font-display text-3xl font-medium text-foreground"
				>
					Check-ins
				</h1>
				<p className="text-sm text-muted-foreground">
					Gerencie e valide os check-ins registrados pelos membros.
				</p>
			</header>

			<CheckInFilterBar status={status} onStatusChange={setStatus} />

			<AdminCheckInsBody query={query} status={status} />

			<AdminCheckInsPager page={page} pages={pages} onChange={setPage} />
		</section>
	)
}

export default function AdminCheckInsPage() {
	return (
		<Suspense fallback={<LoadingState />}>
			<AdminCheckInsPageContent />
		</Suspense>
	)
}
