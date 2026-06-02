"use client"

import { Command } from "cmdk"
import { Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useGymsByName } from "@/features/gyms/api"

interface GymGroupProps {
	query: string
	isActive: boolean
	onSelect: () => void
}

export function GymGroup({ query, isActive, onSelect }: GymGroupProps) {
	const router = useRouter()

	const { data: gyms = [], isLoading } = useGymsByName({
		name: isActive ? query : "",
		page: 1,
		enabled: isActive,
	})

	if (!isActive) return null

	if (isLoading) {
		return (
			<Command.Group heading="Academias">
				<div
					data-testid="gym-group-loading"
					role="status"
					className="space-y-1 px-3 py-2"
					aria-label="Carregando academias"
				>
					{[1, 2].map((i) => (
						<div
							key={i}
							className="h-8 animate-pulse rounded-md bg-surface-3"
						/>
					))}
				</div>
			</Command.Group>
		)
	}

	if (gyms.length === 0) {
		return (
			<Command.Group heading="Academias">
				<p className="px-3 py-2 text-sm text-subtle">
					Nenhuma academia encontrada.
				</p>
			</Command.Group>
		)
	}

	return (
		<Command.Group heading="Academias">
			{gyms.map((gym) => (
				<Command.Item
					key={gym.id}
					value={gym.title}
					onSelect={() => {
						const params = new URLSearchParams({ search: gym.title })
						router.push(`/academias?${params.toString()}`)
						onSelect()
					}}
					className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground aria-selected:bg-surface-2"
				>
					<Building2
						className="h-4 w-4 shrink-0 text-subtle"
						aria-hidden="true"
					/>
					{gym.title}
				</Command.Item>
			))}
		</Command.Group>
	)
}
