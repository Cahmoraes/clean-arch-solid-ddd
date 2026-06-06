"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import type { Gym } from "@/features/gyms/api"
import { GymCard } from "@/features/gyms/components/gym-card"

const SKELETON_COUNT = 6

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
				<Skeleton
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are not reorderable
					key={index}
					className="h-[260px] w-full rounded-lg"
				/>
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

function ResultsList({ items, isAdmin }: { items: Gym[]; isAdmin?: boolean }) {
	return (
		<ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]">
			{items.map((gym) => (
				<li key={gym.id} className="flex flex-col">
					<GymCard
						gym={gym}
						adminEditHref={
							isAdmin ? `/admin/academias/${gym.id}/editar` : undefined
						}
					/>
				</li>
			))}
		</ul>
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
