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

type StatusTone = "success" | "warning" | "danger" | "neutral"

function statusLabel(status: string): string {
	if (status === "activated") return "Ativo"
	if (status === "suspended") return "Inativo"
	if (status === "locked") return "Bloqueado"
	return status
}

function statusTone(status: string): StatusTone {
	if (status === "activated") return "success"
	if (status === "locked") return "warning"
	if (status === "suspended") return "danger"
	return "neutral"
}

function isActivationKey(key: string): boolean {
	return key === "Enter" || key === " "
}

interface InteractiveRowProps {
	onClick: () => void
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
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
	hasNestedCheckbox: boolean,
	isHighlighted: boolean,
	className: string | undefined,
): string {
	return cn(
		"flex w-full items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-[border-color] duration-300 ease-out",
		isInteractive &&
			!hasNestedCheckbox &&
			"cursor-pointer hover:border-border-strong",
		isHighlighted && "border-accent bg-accent/40",
		className,
	)
}

function contentClassName(isInteractive: boolean, hasNestedCheckbox: boolean) {
	return cn(
		"flex min-w-0 flex-1 items-center gap-4 text-left",
		isInteractive && hasNestedCheckbox && "cursor-pointer",
	)
}

interface ResolvedInteractiveProps {
	rowProps: Partial<InteractiveRowProps>
	contentProps: Partial<InteractiveRowProps>
}

function resolveInteractiveProps(
	isInteractive: boolean,
	hasNestedCheckbox: boolean,
	onSelect: () => void,
	isSelected: boolean | undefined,
): ResolvedInteractiveProps {
	if (!isInteractive) return { rowProps: {}, contentProps: {} }
	const props = buildInteractiveRowProps(onSelect, isSelected)
	return hasNestedCheckbox
		? { rowProps: {}, contentProps: props }
		: { rowProps: props, contentProps: {} }
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
	// Só existe risco de aninhamento (checkbox dentro de role="button") quando
	// selectable ativa o checkbox. Sem checkbox, o próprio <li> permanece o
	// elemento interativo, preservando o contrato já usado por consumidores
	// existentes (ex.: página de usuários sem seleção em massa).
	const hasNestedCheckbox = Boolean(selectable)

	function handleSelect() {
		onSelect?.(user)
	}

	const {
		rowProps: rowInteractiveProps,
		contentProps: contentInteractiveProps,
	} = resolveInteractiveProps(
		isInteractive,
		hasNestedCheckbox,
		handleSelect,
		isSelected,
	)

	return (
		<li
			data-testid={`user-row-${user.id}`}
			{...rowInteractiveProps}
			className={rowClassName(
				isInteractive,
				hasNestedCheckbox,
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
				{...contentInteractiveProps}
				className={contentClassName(isInteractive, hasNestedCheckbox)}
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
