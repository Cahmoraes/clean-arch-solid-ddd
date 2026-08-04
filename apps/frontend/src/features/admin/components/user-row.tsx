import type { KeyboardEvent } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { RoleBadge } from "@/components/ui/role-badge"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AdminUser } from "@/features/admin/api/use-users"
import { cn } from "@/lib/cn"

export interface UserRowProps {
	user: AdminUser
	onSelect?: (user: AdminUser) => void
	isSelected?: boolean
	className?: string
	selectable?: boolean
	checked?: boolean
	selectDisabled?: boolean
	onToggleSelect?: (user: AdminUser, checked: boolean) => void
}

type StatusTone = "success" | "warning" | "neutral"

function statusLabel(status: string): string {
	if (status === "activated") return "Ativo"
	if (status === "suspended") return "Inativo"
	if (status === "locked") return "Bloqueado"
	return status
}

function statusTone(status: string): StatusTone {
	if (status === "activated") return "success"
	if (status === "locked") return "warning"
	return "neutral"
}

function isActivationKey(key: string): boolean {
	return key === "Enter" || key === " "
}

interface InteractiveRowProps {
	onClick: () => void
	onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
	role: "button"
	tabIndex: number
	"aria-pressed": boolean
}

// O checkbox de seleção em massa fica fora deste wrapper interativo (irmão,
// não descendente) para não aninhar um controle focável (checkbox) dentro
// de outro (role="button"), o que viola a regra de a11y de não aninhar
// controles interativos.
function buildInteractiveRowProps(
	onSelect: () => void,
	isSelected: boolean | undefined,
): InteractiveRowProps {
	return {
		onClick: onSelect,
		onKeyDown: (event) => {
			if (!isActivationKey(event.key)) return
			event.preventDefault()
			onSelect()
		},
		role: "button",
		tabIndex: 0,
		"aria-pressed": Boolean(isSelected),
	}
}

function rowClassName(
	isInteractive: boolean,
	isHighlighted: boolean,
	className: string | undefined,
): string {
	return cn(
		"flex w-full items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-[border-color] duration-300 ease-out",
		isInteractive && "hover:border-border-strong",
		isHighlighted && "border-accent bg-accent/40",
		className,
	)
}

export function UserRow({
	user,
	onSelect,
	isSelected,
	className,
	selectable,
	checked,
	selectDisabled,
	onToggleSelect,
}: UserRowProps) {
	const isInteractive = typeof onSelect === "function"

	function handleSelect() {
		onSelect?.(user)
	}

	const interactiveProps = isInteractive
		? buildInteractiveRowProps(handleSelect, isSelected)
		: {}

	return (
		<li
			data-testid={`user-row-${user.id}`}
			className={rowClassName(
				isInteractive,
				Boolean(isSelected || checked),
				className,
			)}
		>
			{selectable && (
				<Checkbox
					checked={checked}
					disabled={selectDisabled}
					aria-label={`Selecionar ${user.name}`}
					onCheckedChange={(value) => {
						onToggleSelect?.(user, value === true)
					}}
				/>
			)}
			<div
				{...interactiveProps}
				className={cn(
					"flex min-w-0 flex-1 items-center gap-4 text-left",
					isInteractive && "cursor-pointer",
				)}
			>
				<Avatar name={user.name} size="sm" />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-[15.5px] font-semibold text-card-foreground">
						{user.name}
					</span>
					<span className="truncate font-mono text-[13px] text-subtle">
						{user.email}
					</span>
				</div>
				<RoleBadge role={user.role} />
				<StatusBadge tone={statusTone(user.status)}>
					{statusLabel(user.status)}
				</StatusBadge>
			</div>
		</li>
	)
}
