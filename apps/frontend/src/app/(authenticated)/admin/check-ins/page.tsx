"use client"

import { ShieldCheck } from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import {
	CHECK_INS_DEFAULT_PAGE_SIZE,
	type CheckIn,
	useCheckIns,
} from "@/features/check-ins/api"
import { CheckInActions } from "@/features/check-ins/components/check-in-actions"
import { CheckInFilterBar } from "@/features/check-ins/components/check-in-filter-bar"
import { CheckInItem } from "@/features/check-ins/components/check-in-item"
import { CheckInSearchInput } from "@/features/check-ins/components/check-in-search-input"
import { CheckInSortToggle } from "@/features/check-ins/components/check-in-sort-toggle"
import { CheckInsPager } from "@/features/check-ins/components/check-ins-pager"
import { useAdminCheckInStats } from "@/features/check-ins/hooks/use-admin-check-in-stats"
import {
	type CheckInFilterStatus,
	useCheckInFilters,
} from "@/features/check-ins/hooks/use-check-in-filters"
import {
	CHECK_IN_STATUS_LABELS,
	totalCheckInPages,
} from "@/features/check-ins/utils"
import { useDebounce } from "@/hooks/use-debounce"

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
			title={`Nenhum check-in ${CHECK_IN_STATUS_LABELS[status]} encontrado`}
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
	const { data: statsData } = useAdminCheckInStats()

	const [gymNameInput, setGymNameInput] = useState(gymName)
	const debouncedGymName = useDebounce(gymNameInput, 300)

	useEffect(() => {
		// Evita loop de navegação: setGymName muda de identidade a cada
		// router.replace (depende de searchParams), então só navega
		// quando o valor debounced realmente difere do valor na URL.
		if (debouncedGymName === gymName) return
		setGymName(debouncedGymName)
	}, [debouncedGymName, gymName, setGymName])

	const query = useCheckIns({ page, status, gymName, sortOrder })
	const pages = totalCheckInPages(
		query.data?.total ?? 0,
		CHECK_INS_DEFAULT_PAGE_SIZE,
	)

	return (
		<section
			aria-label="Check-ins"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
			<div className="flex flex-col gap-5">
				<PageHeader
					eyebrow="Admin"
					title="Check-ins"
					subtitle="Gerencie e valide os check-ins registrados pelos membros."
					className="mb-0"
				/>
				<div className="flex flex-wrap items-center gap-3">
					<CheckInFilterBar
						status={status}
						onStatusChange={setStatus}
						stats={statsData}
					/>
					<div className="flex flex-1 gap-2 min-w-0">
						<CheckInSearchInput
							value={gymNameInput}
							onChange={setGymNameInput}
							placeholder="Buscar por academia..."
							className="flex-1"
						/>
						<CheckInSortToggle value={sortOrder} onValueChange={setSortOrder} />
					</div>
				</div>
			</div>

			<AdminCheckInsBody query={query} status={status} />

			<CheckInsPager
				page={page}
				pages={pages}
				onChange={setPage}
				testId="admin-checkins"
			/>
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
