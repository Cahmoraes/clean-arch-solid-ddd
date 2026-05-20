"use client"

import { CalendarCheck } from "lucide-react"
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
	useMyCheckIns,
} from "@/features/check-ins/api"
import { CheckInActions } from "@/features/check-ins/components/check-in-actions"
import { CheckInFilterBar } from "@/features/check-ins/components/check-in-filter-bar.js"
import { CheckInItem } from "@/features/check-ins/components/check-in-item"
import {
	type CheckInFilterStatus,
	useCheckInFilters,
} from "@/features/check-ins/hooks/use-check-in-filters.js"
import { useAuthStore } from "@/lib/auth/auth-store"

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4"]

function LoadingState() {
	return (
		<ul
			data-testid="checkins-skeleton"
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

interface ListProps {
	items: ReadonlyArray<{
		id: string
		gymId: string
		gymTitle?: string | null
		validatedAt: string | null
		rejectedAt: string | null
		status: "pending" | "validated" | "rejected"
		createdAt: string
	}>
}

function CheckInsList({ items }: ListProps) {
	const user = useAuthStore((state) => state.user)
	const isAdmin = user?.role === "ADMIN"

	return (
		<ul data-testid="checkins-list" className="flex flex-col gap-2">
			{items.map((checkIn) => (
				<CheckInItem
					key={checkIn.id}
					checkIn={checkIn}
					action={isAdmin ? <CheckInActions checkIn={checkIn} /> : undefined}
				/>
			))}
		</ul>
	)
}

interface PagerProps {
	page: number
	pages: number
	onChange: (next: number) => void
}

function CheckInsPager({ page, pages, onChange }: PagerProps) {
	if (pages <= 1) return null
	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid="checkins-prev"
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
						data-testid="checkins-next"
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

function HistoryEmpty({ status }: { status: CheckInFilterStatus }) {
	if (!status) {
		return (
			<EmptyState
				icon={CalendarCheck}
				title="Você ainda não fez check-in"
				description="Procure uma academia próxima e registre sua presença."
			/>
		)
	}
	return (
		<EmptyState
			icon={CalendarCheck}
			title={`Nenhum check-in ${STATUS_LABELS[status]} encontrado`}
			description="Tente selecionar outro filtro."
		/>
	)
}

interface BodyProps {
	query: ReturnType<typeof useMyCheckIns>
	status: CheckInFilterStatus
}

function HistoryError({ query }: Pick<BodyProps, "query">) {
	return (
		<EmptyState
			title="Não foi possível carregar seu histórico"
			description={query.error?.userMessage}
			action={
				<Button
					variant="outline"
					onClick={() => query.refetch()}
					data-testid="checkins-retry"
				>
					Tentar novamente
				</Button>
			}
		/>
	)
}

function CheckInsBody({ query, status }: BodyProps) {
	if (query.isLoading) return <LoadingState />
	if (query.isError) return <HistoryError query={query} />
	if (!query.isSuccess) return null
	const items = query.data?.items ?? []
	if (items.length === 0) return <HistoryEmpty status={status} />
	return <CheckInsList items={items} />
}

function CheckInsPageContent() {
	const { status, page, setStatus, setPage } = useCheckInFilters()
	const query = useMyCheckIns({ page, status })
	const pages = totalPages(query.data?.total ?? 0, CHECK_INS_DEFAULT_PAGE_SIZE)

	return (
		<section
			aria-labelledby="checkins-title"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
			<header className="flex flex-col gap-1">
				<h1
					id="checkins-title"
					className="font-display text-3xl font-medium text-foreground"
				>
					Histórico de check-ins
				</h1>
				<p className="text-sm text-muted-foreground">
					Acompanhe sua frequência nas academias.
				</p>
			</header>

			<CheckInFilterBar status={status} onStatusChange={setStatus} />

			<CheckInsBody query={query} status={status} />

			<CheckInsPager page={page} pages={pages} onChange={setPage} />
		</section>
	)
}

export default function CheckInsPage() {
	return (
		<Suspense fallback={<LoadingState />}>
			<CheckInsPageContent />
		</Suspense>
	)
}
