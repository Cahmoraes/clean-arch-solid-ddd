"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import type { Gym } from "@/features/gyms/api"
import { GymCard } from "@/features/gyms/components/GymCard"

const SKELETON_COUNT = 6

export interface GymResultsProps {
	query: string
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	onRetry: () => void
	items: Gym[]
}

function ResultsLoading() {
	return (
		<div
			data-testid="gym-results-loading"
			className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
		>
			{Array.from({ length: SKELETON_COUNT }).map((_, index) => (
				<Skeleton
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are not reorderable
					key={index}
					className="h-32 w-full"
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

function ResultsList({ items }: { items: Gym[] }) {
	return (
		<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((gym) => (
				<li key={gym.id}>
					<GymCard gym={gym} />
				</li>
			))}
		</ul>
	)
}

export function GymResults({
	query,
	isLoading,
	isError,
	errorMessage,
	onRetry,
	items,
}: GymResultsProps) {
	if (!query) {
		return (
			<EmptyState
				icon={Search}
				title="Comece pela busca"
				description="Digite o nome de uma academia e pressione Buscar."
			/>
		)
	}
	if (isLoading) return <ResultsLoading />
	if (isError) return <ResultsError message={errorMessage} onRetry={onRetry} />
	if (items.length === 0) return <ResultsEmpty query={query} />
	return <ResultsList items={items} />
}
