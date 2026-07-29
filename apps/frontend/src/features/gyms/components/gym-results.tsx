"use client"

import { Search } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import type { Gym } from "@/features/gyms/api"
import { GymCard } from "@/features/gyms/components/gym-card"
import { GymCardSkeleton } from "@/features/gyms/components/gym-card-skeleton"
import { GymRow } from "@/features/gyms/components/gym-row"
import { cn } from "@/lib/cn"
import type { GymView } from "@/lib/ui-state/gym-view-cookie"
import { useGymViewStore } from "@/lib/ui-state/gym-view-store"

const SKELETON_COUNT = 6

const listVariants = {
	hidden: {},
	show: { transition: { staggerChildren: 0.07 } },
} as const

const cardVariants = {
	hidden: { opacity: 0, scale: 0.92 },
	show: {
		opacity: 1,
		scale: 1,
		transition: { type: "spring", stiffness: 280, damping: 22 },
	},
	exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
} as const

export interface GymResultsProps {
	query: string
	isBrowseMode?: boolean
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	onRetry: () => void
	items: Gym[]
	isAdmin?: boolean
}

function ResultsLoading() {
	return (
		<div
			data-testid="gym-results-loading"
			className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]"
		>
			{Array.from({ length: SKELETON_COUNT }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are not reorderable
				<GymCardSkeleton key={index} />
			))}
		</div>
	)
}

function ResultsError({
	message,
	onRetry,
}: {
	message?: string
	onRetry: () => void
}) {
	return (
		<EmptyState
			title="Não foi possível buscar academias"
			description={message ?? "Tente novamente."}
			action={
				<Button
					variant="outline"
					onClick={onRetry}
					data-testid="gym-results-retry"
				>
					Tentar novamente
				</Button>
			}
		/>
	)
}

function ResultsEmpty({ query }: { query: string }) {
	return (
		<EmptyState
			icon={Search}
			title="Nenhuma academia encontrada"
			description={`Não encontramos resultados para "${query}". Tente outro termo.`}
		/>
	)
}

function ResultsEmptyBrowse() {
	return (
		<EmptyState
			icon={Search}
			title="Nenhuma academia cadastrada"
			description="Ainda não há academias disponíveis no sistema."
		/>
	)
}

function ResultsListItem({
	gym,
	view,
	adminEditHref,
}: {
	gym: Gym
	view: GymView
	adminEditHref?: string
}) {
	return (
		<motion.li
			variants={cardVariants}
			exit={cardVariants.exit}
			className={cn(
				view === "cards"
					? "flex flex-col"
					: "border-b border-border last:border-b-0",
			)}
		>
			{view === "cards" ? (
				<GymCard gym={gym} adminEditHref={adminEditHref} />
			) : (
				<GymRow gym={gym} adminEditHref={adminEditHref} />
			)}
		</motion.li>
	)
}

function ResultsList({ items, isAdmin }: { items: Gym[]; isAdmin?: boolean }) {
	const view = useGymViewStore((state) => state.view)

	return (
		<motion.ul
			data-testid="gym-results-list"
			variants={listVariants}
			initial="hidden"
			animate="show"
			className={cn(
				view === "cards"
					? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]"
					: "flex flex-col overflow-hidden rounded-[22px] border border-border",
			)}
		>
			<AnimatePresence>
				{items.map((gym) => (
					<ResultsListItem
						key={gym.id}
						gym={gym}
						view={view}
						adminEditHref={
							isAdmin ? `/admin/academias/${gym.id}/editar` : undefined
						}
					/>
				))}
			</AnimatePresence>
		</motion.ul>
	)
}

function ResultsNoQuery() {
	return (
		<EmptyState
			icon={Search}
			title="Comece pela busca"
			description="Digite o nome de uma academia e pressione Buscar."
		/>
	)
}

function GymContents({
	isLoading,
	isError,
	errorMessage,
	onRetry,
	items,
	query,
	isAdmin,
}: Omit<GymResultsProps, "isBrowseMode">) {
	if (isLoading) return <ResultsLoading />
	if (isError) return <ResultsError message={errorMessage} onRetry={onRetry} />
	if (items.length > 0) return <ResultsList items={items} isAdmin={isAdmin} />
	return query ? <ResultsEmpty query={query} /> : <ResultsEmptyBrowse />
}

export function GymResults({
	query,
	isBrowseMode = false,
	...rest
}: GymResultsProps) {
	if (!isBrowseMode && !query) return <ResultsNoQuery />
	return <GymContents query={query} {...rest} />
}
