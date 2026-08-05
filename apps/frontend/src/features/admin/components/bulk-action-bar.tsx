"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

export interface BulkActionBarProps {
	selectedCount: number
	onActivate: () => void
	onDeactivate: () => void
	onClear: () => void
	className?: string
}

function selectionLabel(count: number): string {
	return `${count} ${count === 1 ? "selecionado" : "selecionados"}`
}

export function BulkActionBar({
	selectedCount,
	onActivate,
	onDeactivate,
	onClear,
	className,
}: BulkActionBarProps) {
	if (selectedCount === 0) return null

	return (
		<div
			data-testid="bulk-action-bar"
			className={cn(
				"sticky bottom-4 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-5 py-4 shadow-lg",
				className,
			)}
		>
			<span className="text-sm font-medium text-card-foreground">
				{selectionLabel(selectedCount)}
			</span>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="text-success hover:bg-success-soft hover:text-success"
					onClick={onActivate}
				>
					Ativar
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="text-warning hover:bg-warning-soft hover:text-warning"
					onClick={onDeactivate}
				>
					Desativar
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="w-8 px-0"
					onClick={onClear}
					aria-label="Limpar seleção"
				>
					<X aria-hidden="true" />
				</Button>
			</div>
		</div>
	)
}
