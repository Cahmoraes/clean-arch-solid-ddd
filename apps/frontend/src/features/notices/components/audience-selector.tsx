"use client"

import { useId } from "react"
import {
	NOTICE_AUDIENCE_OPTIONS,
	type NoticeAudienceOption,
} from "@/features/notices/notice-audience-options"
import type { NoticeAudience } from "@/features/notices/schemas/notice-schema"
import { cn } from "@/lib/cn"

export interface AudienceSelectorProps {
	value: NoticeAudience
	onChange: (value: NoticeAudience) => void
	disabled?: boolean
}

interface AudienceCardProps {
	option: NoticeAudienceOption
	groupId: string
	selected: boolean
	disabled: boolean
	onSelect: (value: NoticeAudience) => void
}

function AudienceCard({
	option,
	groupId,
	selected,
	disabled,
	onSelect,
}: AudienceCardProps) {
	const titleId = `${groupId}-${option.value}-title`
	const descriptionId = `${groupId}-${option.value}-description`

	return (
		<label
			data-selected={selected}
			className={cn(
				"relative flex cursor-pointer flex-col gap-1 rounded-lg border bg-card p-3 pr-9 transition-colors",
				"has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-offset-2",
				"has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
				selected
					? "border-primary shadow-[0_0_0_1px_var(--color-primary)]"
					: "border-border hover:border-border-strong",
			)}
		>
			<input
				type="radio"
				name="audience"
				value={option.value}
				checked={selected}
				disabled={disabled}
				onChange={() => onSelect(option.value)}
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				className="sr-only"
			/>
			<span
				id={titleId}
				className="block text-sm font-semibold text-foreground"
			>
				{option.label}
			</span>
			<span id={descriptionId} className="block text-xs text-muted-foreground">
				{option.description}
			</span>
			<span
				aria-hidden="true"
				className={cn(
					"absolute right-3 top-3 size-3.5 rounded-sm border",
					selected ? "border-primary bg-primary" : "border-border-strong",
				)}
			/>
		</label>
	)
}

export function AudienceSelector({
	value,
	onChange,
	disabled = false,
}: AudienceSelectorProps) {
	const groupId = useId()

	return (
		<fieldset className="flex flex-col gap-2 border-0 p-0">
			<legend className="mb-2 text-sm font-medium text-foreground">
				Público-alvo
			</legend>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				{NOTICE_AUDIENCE_OPTIONS.map((option) => (
					<AudienceCard
						key={option.value}
						option={option}
						groupId={groupId}
						selected={option.value === value}
						disabled={disabled}
						onSelect={onChange}
					/>
				))}
			</div>
		</fieldset>
	)
}
