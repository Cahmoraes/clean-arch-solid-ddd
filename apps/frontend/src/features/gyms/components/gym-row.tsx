import Link from "next/link"
import { MapPin, Pencil } from "@/components/ui/pixel-icons"
import { StatusBadge } from "@/components/ui/status-badge"
import type { GymSummary } from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"
import { resolveLocation } from "@/features/gyms/lib/resolve-location"
import { resolveGymStatusBadge } from "@/features/gyms/lib/resolve-status-badge"

export interface GymRowProps {
	gym: GymSummary
	adminEditHref?: string
}

export function GymRow({ gym, adminEditHref }: GymRowProps) {
	const { tone: statusTone, label: statusLabel } = resolveGymStatusBadge(
		gym,
		adminEditHref,
	)
	return (
		<div data-testid="gym-row-wrapper" className="relative flex w-full">
			<Link
				href={`/academias/${gym.id}`}
				data-testid={`gym-row-${gym.id}`}
				className={`flex w-full items-center gap-[14px] bg-card px-4 py-3 transition-colors hover:bg-surface-2 ${adminEditHref ? "pr-14" : ""}`}
			>
				<div className="relative h-11 w-11 flex-shrink-0">
					<GymImage
						imageKey={gym.imageKey}
						alt={gym.title}
						className="h-full w-full rounded-sm"
						hoverEffect={false}
					/>
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex items-center gap-2">
						<p className="font-display text-[15px] text-card-foreground">
							{gym.title}
						</p>
						<StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
					</div>
					{gym.description ? (
						<p className="line-clamp-1 text-[13px] text-muted-foreground">
							{gym.description}
						</p>
					) : null}
					<p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
						<MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
						<span className="line-clamp-1">{resolveLocation(gym)}</span>
					</p>
				</div>
				<div className="flex flex-shrink-0 items-center gap-3">
					{gym.phone ? (
						<span className="text-[12.5px] text-subtle">{gym.phone}</span>
					) : (
						<span className="text-[12.5px] text-subtle">Ver detalhes</span>
					)}
					<span className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-foreground">
						Check-in
					</span>
				</div>
			</Link>
			{adminEditHref ? (
				<Link
					href={adminEditHref}
					data-testid={`gym-row-edit-${gym.id}`}
					aria-label={`Editar academia ${gym.title}`}
					className="absolute right-3 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-accent"
				>
					<Pencil className="h-4 w-4" aria-hidden="true" />
				</Link>
			) : null}
		</div>
	)
}
