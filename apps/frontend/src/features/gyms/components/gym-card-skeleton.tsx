export function GymCardSkeleton() {
	return (
		<div
			data-testid="gym-card-skeleton"
			className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card"
		>
			<div
				data-testid="gym-card-skeleton-image"
				className="h-[140px] w-full shimmer"
			/>
			<div className="flex flex-1 flex-col gap-2.5 p-[18px]">
				<div
					data-testid="gym-card-skeleton-title"
					className="h-4 w-3/4 rounded shimmer"
				/>
				<div className="h-3 w-1/2 rounded shimmer" />
				<div className="mt-2 h-3 w-full rounded shimmer" />
				<div className="mt-auto flex items-center justify-between border-t border-border pt-3.5">
					<div className="h-3 w-1/4 rounded shimmer" />
					<div className="h-7 w-20 rounded shimmer" />
				</div>
			</div>
		</div>
	)
}
