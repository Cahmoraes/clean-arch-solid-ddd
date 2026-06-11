import { Check, Clock, X } from "lucide-react"
import type { ComponentType } from "react"
import type { CheckIn } from "@/features/check-ins/api"
import { cn } from "@/lib/cn"

const STATUS_CHIP: Record<
	CheckIn["status"],
	{ cls: string; Icon: ComponentType<{ className?: string }> }
> = {
	validated: { cls: "bg-success-soft text-success", Icon: Check },
	pending: { cls: "bg-warning-soft text-warning", Icon: Clock },
	rejected: { cls: "bg-destructive-soft text-destructive", Icon: X },
}

function formatDate(iso: string): string {
	try {
		return new Intl.DateTimeFormat("pt-BR", {
			dateStyle: "short",
			timeStyle: "short",
		}).format(new Date(iso))
	} catch {
		return iso
	}
}

export interface CheckInItemProps {
	checkIn: CheckIn
	action?: React.ReactNode
}

export function CheckInItem({ checkIn, action }: CheckInItemProps) {
	const chip = STATUS_CHIP[checkIn.status] ?? STATUS_CHIP.pending
	const { Icon } = chip

	return (
		<li
			data-testid={`checkin-item-${checkIn.id}`}
			className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-[border-color] duration-300 ease-out hover:border-border-strong"
		>
			<span
				data-status={checkIn.status}
				className={cn(
					"inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px]",
					chip.cls,
				)}
			>
				<Icon className="h-5 w-5" aria-hidden="true" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-[15px] font-semibold text-card-foreground">
					{checkIn.gymTitle ?? `Academia ${checkIn.gymId}`}
				</p>
				<p className="text-[13px] text-muted-foreground">
					Realizado em {formatDate(checkIn.createdAt)}
				</p>
			</div>
			<time className="font-mono text-xs text-subtle tabular max-[560px]:hidden">
				{formatDate(checkIn.createdAt)}
			</time>
			{action}
		</li>
	)
}
