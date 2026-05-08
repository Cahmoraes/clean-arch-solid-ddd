import { CheckCircle2, Clock, XCircle } from "lucide-react"
import type { CheckIn } from "@/features/check-ins/api"

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleString("pt-BR", {
			dateStyle: "short",
			timeStyle: "short",
		})
	} catch {
		return iso
	}
}

function StatusBadge({ checkIn }: { checkIn: CheckIn }) {
	const status = checkIn.status
	if (status === "validated") {
		return (
			<span
				data-testid={`checkin-status-${checkIn.id}`}
				className="inline-flex items-center gap-1 text-xs text-emerald-600"
			>
				<CheckCircle2 aria-hidden className="h-4 w-4" />
				Validado
			</span>
		)
	}
	if (status === "rejected") {
		return (
			<span
				data-testid={`checkin-status-${checkIn.id}`}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground"
			>
				<XCircle aria-hidden className="h-4 w-4" />
				Rejeitado
			</span>
		)
	}
	return (
		<span
			data-testid={`checkin-status-${checkIn.id}`}
			className="inline-flex items-center gap-1 text-xs text-muted-foreground"
		>
			<Clock aria-hidden className="h-4 w-4" />
			Pendente
		</span>
	)
}

export interface CheckInItemProps {
	checkIn: CheckIn
	action?: React.ReactNode
}

export function CheckInItem({ checkIn, action }: CheckInItemProps) {
	return (
		<li
			data-testid={`checkin-item-${checkIn.id}`}
			className="flex flex-col gap-3 rounded-[12px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<div className="flex flex-col gap-1">
				<p className="text-sm font-medium text-card-foreground">
					{checkIn.gymTitle ?? `Academia ${checkIn.gymId}`}
				</p>
				<p className="text-xs text-muted-foreground">
					Realizado em {formatDate(checkIn.createdAt)}
				</p>
			</div>
			<div className="flex items-center gap-3">
				<StatusBadge checkIn={checkIn} />
				{action}
			</div>
		</li>
	)
}
