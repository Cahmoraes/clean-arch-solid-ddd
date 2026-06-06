import { MapPin } from "lucide-react"
import Link from "next/link"
import type { Gym } from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"

export interface GymCardProps {
	gym: Gym
}

function resolveLocation(gym: Gym): string {
	if (gym.address) return gym.address
	return `${gym.latitude.toFixed(4)}, ${gym.longitude.toFixed(4)}`
}

export function GymCard({ gym }: GymCardProps) {
	return (
		<Link
			href={`/academias/${gym.id}`}
			data-testid={`gym-card-${gym.id}`}
			className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[transform,border-color] hover:-translate-y-0.5 hover:border-border-strong"
		>
			<div className="relative h-[140px] w-full">
				<GymImage
					imageKey={gym.imageKey}
					alt={gym.title}
					className="h-full w-full"
				/>
				<span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11.5px] font-semibold text-subtle backdrop-blur">
					<span className="h-1.5 w-1.5 rounded-full bg-current" /> Disponível
				</span>
			</div>
			<div className="flex flex-1 flex-col gap-2.5 p-[18px]">
				<p className="font-display text-base font-semibold text-card-foreground">
					{gym.title}
				</p>
				{gym.description ? (
					<p className="line-clamp-2 text-[13px] text-muted-foreground">
						{gym.description}
					</p>
				) : null}
				<p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
					<MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
					<span className="line-clamp-1">{resolveLocation(gym)}</span>
				</p>
				<div className="mt-auto flex items-center justify-between border-t border-border pt-3.5">
					{gym.phone ? (
						<span className="text-[12.5px] text-subtle">{gym.phone}</span>
					) : (
						<span className="text-[12.5px] text-subtle">Ver detalhes</span>
					)}
					<span className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-foreground">
						Check-in
					</span>
				</div>
			</div>
		</Link>
	)
}
