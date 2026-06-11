"use client"

import { SegmentedControl } from "@/components/ui/segmented-control"
import type { PeriodKey } from "../hooks/use-analytics-period"

const PERIOD_ITEMS = [
	{ value: "7d" as PeriodKey, label: "7 dias" },
	{ value: "30d" as PeriodKey, label: "30 dias" },
	{ value: "3m" as PeriodKey, label: "3 meses" },
	{ value: "12m" as PeriodKey, label: "12 meses" },
] as const

interface PeriodSelectorProps {
	value: PeriodKey
	onValueChange: (value: PeriodKey) => void
	className?: string
}

export function PeriodSelector({
	value,
	onValueChange,
	className,
}: PeriodSelectorProps) {
	return (
		<SegmentedControl<PeriodKey>
			items={PERIOD_ITEMS}
			value={value}
			onValueChange={onValueChange}
			aria-label="Selecionar período"
			className={className}
		/>
	)
}
