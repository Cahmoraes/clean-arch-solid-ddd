import { MapPin, Pencil } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import type { Gym } from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"

export interface GymCardProps {
	gym: Gym
	adminEditHref?: string
}

function resolveLocation(gym: Gym): string {
	if (gym.address) return gym.address
	return `${gym.latitude.toFixed(4)}, ${gym.longitude.toFixed(4)}`
}

const cardMotionVariants = {
	rest: {
		y: 0,
		scale: 1,
		boxShadow: "0 0 0 0px rgba(57,229,140,0), 0 0px 0px 0px rgba(0,0,0,0)",
	},
	hover: {
		y: -3,
		scale: 1.015,
		boxShadow:
			"0 0 0 1px rgba(57,229,140,0.45), 0 10px 30px -12px rgba(0,0,0,0.5)",
	},
}

export function GymCard({ gym, adminEditHref }: GymCardProps) {
	return (
		<motion.div
			data-testid="gym-card-wrapper"
			className="relative flex h-full flex-col rounded-lg"
			variants={cardMotionVariants}
			initial="rest"
			animate="rest"
			whileHover="hover"
			transition={{ type: "spring", stiffness: 300, damping: 25 }}
		>
			<Link
				href={`/academias/${gym.id}`}
				data-testid={`gym-card-${gym.id}`}
				className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
			>
				<div className="relative h-[140px] w-full">
					<GymImage
						imageKey={gym.imageKey}
						alt={gym.title}
						className="h-full w-full"
						hoverEffect={false}
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
			{adminEditHref ? (
				<Link
					href={adminEditHref}
					data-testid={`gym-edit-${gym.id}`}
					aria-label={`Editar academia ${gym.title}`}
					className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-primary"
				>
					<Pencil className="h-4 w-4" aria-hidden="true" />
				</Link>
			) : null}
		</motion.div>
	)
}
