"use client"

import { CalendarCheck } from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
	CHECK_INS_DEFAULT_PAGE_SIZE,
	useMyCheckIns,
} from "@/features/check-ins/api"
import { CheckInActions } from "@/features/check-ins/components/check-in-actions"
import { CheckInFilterBar } from "@/features/check-ins/components/check-in-filter-bar"
import { CheckInItem } from "@/features/check-ins/components/check-in-item"
import { CheckInSearchInput } from "@/features/check-ins/components/check-in-search-input"
import { CheckInSortToggle } from "@/features/check-ins/components/check-in-sort-toggle"
import { CheckInsPager } from "@/features/check-ins/components/check-ins-pager"
import {
	type CheckInFilterStatus,
	useCheckInFilters,
} from "@/features/check-ins/hooks/use-check-in-filters"
import { useMyCheckInStats } from "@/features/check-ins/hooks/use-my-check-in-stats"
import {
	CHECK_IN_STATUS_LABELS,
	totalCheckInPages,
} from "@/features/check-ins/utils"
import { useDebounce } from "@/hooks/use-debounce"
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
			title={`Nenhum check-in ${CHECK_IN_STATUS_LABELS[status]} encontrado`}
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
	const {
		status,
		page,
		gymName,
		sortOrder,
		setStatus,
		setPage,
		setGymName,
		setSortOrder,
	} = useCheckInFilters()
	const { data: statsData } = useMyCheckInStats()

	const [gymNameInput, setGymNameInput] = useState(gymName)
	const debouncedGymName = useDebounce(gymNameInput, 300)

	useEffect(() => {
		setGymName(debouncedGymName)
	}, [debouncedGymName, setGymName])

	const query = useMyCheckIns({ page, status, gymName, sortOrder })
	const pages = totalCheckInPages(
		query.data?.total ?? 0,
		CHECK_INS_DEFAULT_PAGE_SIZE,
	)

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

			<CheckInFilterBar
				status={status}
				onStatusChange={setStatus}
				stats={statsData}
			/>

			<div className="flex gap-3">
				<CheckInSearchInput
					value={gymNameInput}
					onChange={setGymNameInput}
					placeholder="Buscar por academia..."
				/>
				<CheckInSortToggle value={sortOrder} onValueChange={setSortOrder} />
			</div>

			<CheckInsBody query={query} status={status} />

			<CheckInsPager
				page={page}
				pages={pages}
				onChange={setPage}
				testId="checkins"
			/>
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
