import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import type { CheckIn } from "@/features/check-ins/api"
import { cn } from "@/lib/cn"

type CheckInStatus = "validated" | "pending" | "rejected"

const STATUS_LABEL: Record<CheckInStatus, string> = {
	validated: "Validado",
	pending: "Pendente",
	rejected: "Rejeitado",
}

const STATUS_DOT_CLASS: Record<CheckInStatus, string> = {
	validated: "bg-accent-foreground dark:bg-accent",
	pending: "bg-warning",
	rejected: "bg-destructive",
}

const STATUS_BADGE_CLASS: Record<CheckInStatus, string> = {
	validated: "border-transparent bg-accent text-accent-foreground",
	pending: "border-transparent bg-warning-soft text-warning",
	rejected: "border-transparent bg-destructive/10 text-destructive",
}

function formatRelativeDate(iso: string): string {
	const date = new Date(iso)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / 86_400_000)

	if (diffDays === 0) {
		return `Hoje, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
	}
	if (diffDays === 1) {
		return `Ontem, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
	}
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	})
}

interface CheckinsTimelineProps {
	checkIns: CheckIn[]
	isLoading?: boolean
}

export function CheckinsTimeline({
	checkIns,
	isLoading,
}: CheckinsTimelineProps) {
	if (isLoading) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<Skeleton className="mb-4 h-4 w-36" />
				{Array.from({ length: 4 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
					<div key={i} className="mb-3 flex items-start gap-3">
						<Skeleton className="mt-1 h-2 w-2 rounded-full" />
						<div className="flex-1">
							<Skeleton className="mb-1 h-4 w-40" />
							<Skeleton className="h-3 w-24" />
						</div>
						<Skeleton className="h-5 w-16 rounded-full" />
					</div>
				))}
			</div>
		)
	}

	const recent = checkIns.slice(0, 5)

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Últimos check-ins
			</p>

			{recent.length === 0 ? (
				<p className="py-4 text-center text-sm text-muted-foreground">
					Nenhum check-in registrado ainda.
				</p>
			) : (
				<ul className="flex flex-col">
					{recent.map((ci) => (
						<li
							key={ci.id}
							className="flex items-center gap-3.5 border-b border-border py-3 last:border-b-0"
						>
							<span
								className={cn(
									"h-2 w-2 flex-shrink-0 rounded-full",
									STATUS_DOT_CLASS[ci.status],
								)}
								aria-hidden="true"
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate text-[14.5px] font-semibold">
									{ci.gymTitle ?? "Academia"}
								</p>
								<p className="text-xs text-subtle">
									{formatRelativeDate(ci.createdAt)}
								</p>
							</div>
							<span
								className={cn(
									"flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
									STATUS_BADGE_CLASS[ci.status],
								)}
							>
								{STATUS_LABEL[ci.status]}
							</span>
						</li>
					))}
				</ul>
			)}

			<div className="mt-4 border-t border-border pt-3 text-right">
				<Link
					href="/check-ins"
					className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
				>
					Ver todos
				</Link>
			</div>
		</div>
	)
}
