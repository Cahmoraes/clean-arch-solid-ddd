import Link from "next/link"
import type { Gym } from "@/features/gyms/api"

export interface GymCardProps {
	gym: Gym
}

export function GymCard({ gym }: GymCardProps) {
	return (
		<Link
			href={`/academias/${gym.id}`}
			data-testid={`gym-card-${gym.id}`}
			className="flex flex-col gap-2 rounded-[12px] border border-light-gray bg-pure-white p-5 transition-colors hover:bg-snow"
		>
			<h3 className="font-display text-lg font-medium text-near-black">
				{gym.title}
			</h3>
			{gym.description ? (
				<p className="line-clamp-2 text-sm text-stone">{gym.description}</p>
			) : null}
			<div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mid-gray">
				{gym.phone ? <span>📞 {gym.phone}</span> : null}
				<span>
					{gym.latitude.toFixed(4)}, {gym.longitude.toFixed(4)}
				</span>
			</div>
		</Link>
	)
}
