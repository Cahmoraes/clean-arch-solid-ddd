import { Skeleton } from "@/components/ui/skeleton"
import type { StatusDistribution } from "@/features/dashboard/hooks/use-dashboard-metrics"

const RADIUS = 28
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ≈ 175.93

interface DonutSegment {
	label: string
	count: number
	color: string
	length: number
	offset: number
}

function buildSegments(dist: StatusDistribution): DonutSegment[] {
	const total = dist.validated + dist.pending + dist.rejected
	if (total === 0) return []

	const validatedLen = (dist.validated / total) * CIRCUMFERENCE
	const pendingLen = (dist.pending / total) * CIRCUMFERENCE
	const rejectedLen = (dist.rejected / total) * CIRCUMFERENCE

	// Offset inicial: rotacionar -90° = deslocar CIRCUMFERENCE/4 = ~43.98
	const startOffset = CIRCUMFERENCE / 4

	return [
		{
			label: "Validado",
			count: dist.validated,
			color: "#4ade80",
			length: validatedLen,
			offset: startOffset,
		},
		{
			label: "Pendente",
			count: dist.pending,
			color: "#facc15",
			length: pendingLen,
			offset: startOffset - validatedLen,
		},
		{
			label: "Rejeitado",
			count: dist.rejected,
			color: "#f87171",
			length: rejectedLen,
			offset: startOffset - validatedLen - pendingLen,
		},
	]
}

interface StatusDonutCardProps {
	distribution: StatusDistribution
	isLoading?: boolean
}

export function StatusDonutCard({
	distribution,
	isLoading,
}: StatusDonutCardProps) {
	if (isLoading) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<Skeleton className="mb-4 h-4 w-40" />
				<div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-6">
					<Skeleton className="h-20 w-20 rounded-full" />
					<div className="flex flex-row flex-wrap justify-center gap-x-3 gap-y-2 md:flex-col md:gap-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-24" />
					</div>
				</div>
			</div>
		)
	}

	const total =
		distribution.validated + distribution.pending + distribution.rejected
	const segments = buildSegments(distribution)

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Status dos check-ins
			</p>
			<div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-6">
				<svg
					width="80"
					height="80"
					viewBox="0 0 80 80"
					aria-label={`Distribuição de status: ${distribution.validated} validados, ${distribution.pending} pendentes, ${distribution.rejected} rejeitados`}
					role="img"
				>
					{/* Track */}
					<circle
						cx="40"
						cy="40"
						r={RADIUS}
						fill="none"
						stroke="hsl(var(--muted))"
						strokeWidth="14"
					/>
					{total === 0
						? null
						: segments.map((seg) => (
								<circle
									key={seg.label}
									cx="40"
									cy="40"
									r={RADIUS}
									fill="none"
									stroke={seg.color}
									strokeWidth="14"
									strokeDasharray={`${seg.length} ${CIRCUMFERENCE}`}
									strokeDashoffset={seg.offset}
								/>
							))}
				</svg>

				<ul className="flex flex-row flex-wrap justify-center gap-x-4 gap-y-2 md:flex-col md:gap-2">
					{[
						{
							label: "Validado",
							count: distribution.validated,
							color: "#4ade80",
						},
						{
							label: "Pendente",
							count: distribution.pending,
							color: "#facc15",
						},
						{
							label: "Rejeitado",
							count: distribution.rejected,
							color: "#f87171",
						},
					].map(({ label, count, color }) => (
						<li key={label} className="flex items-center gap-2 text-sm">
							<span
								className="h-2 w-2 flex-shrink-0 rounded-full"
								style={{ background: color }}
								aria-hidden="true"
							/>
							<span className="text-muted-foreground">{label}</span>
							<span className="ml-auto font-medium">{count}</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
