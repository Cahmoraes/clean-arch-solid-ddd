import {
	Activity,
	CheckCircle2,
	KeyRound,
	ShieldAlert,
	ShieldCheck,
	UserCircle,
} from "lucide-react"
import type { ComponentType } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { NumberedPagination } from "@/components/ui/numbered-pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import type {
	UserActivityEvent,
	UserActivityEventType,
	UserActivityPagination,
} from "../api/use-user-activity"
import { formatActivityGroupLabel, formatActivityTime } from "./activity-format"

const ACTIVITY_SKELETON_KEYS = [0, 1, 2] as const

export type {
	UserActivityEvent,
	UserActivityEventType,
} from "../api/use-user-activity"

export interface ActivityTabProps {
	events?: UserActivityEvent[]
	isLoading?: boolean
	isError?: boolean
	isFetching?: boolean
	isPlaceholderData?: boolean
	pagination?: UserActivityPagination
	onPageChange?: (page: number) => void
}

interface ActivityIconConfig {
	icon: ComponentType<{ className?: string }>
	iconClassName: string
	badgeClassName: string
	categoryLabel: string
}

const ACTIVITY_ICON_CONFIG: Record<UserActivityEventType, ActivityIconConfig> =
	{
		CHECK_IN: {
			icon: CheckCircle2,
			iconClassName: "text-accent",
			badgeClassName: "bg-accent/16",
			categoryLabel: "Check-in",
		},
		PASSWORD_CHANGED: {
			icon: KeyRound,
			iconClassName: "text-warning",
			badgeClassName: "bg-warning-soft",
			categoryLabel: "Segurança",
		},
		ACCOUNT_LOCKED: {
			icon: ShieldAlert,
			iconClassName: "text-warning",
			badgeClassName: "bg-warning-soft",
			categoryLabel: "Segurança",
		},
		GOOGLE_LINKED: {
			icon: UserCircle,
			iconClassName: "text-muted-foreground",
			badgeClassName: "bg-surface-3",
			categoryLabel: "Conta",
		},
		PROFILE_UPDATED: {
			icon: UserCircle,
			iconClassName: "text-muted-foreground",
			badgeClassName: "bg-surface-3",
			categoryLabel: "Perfil",
		},
		ROLE_CHANGED: {
			icon: ShieldCheck,
			iconClassName: "text-muted-foreground",
			badgeClassName: "bg-surface-3",
			categoryLabel: "Administrativo",
		},
		STATUS_CHANGED: {
			icon: UserCircle,
			iconClassName: "text-muted-foreground",
			badgeClassName: "bg-surface-3",
			categoryLabel: "Administrativo",
		},
		LOGIN: {
			icon: UserCircle,
			iconClassName: "text-muted-foreground",
			badgeClassName: "bg-surface-3",
			categoryLabel: "Conta",
		},
	}

interface ActivityGroup {
	label: string
	events: UserActivityEvent[]
}

// Assume events já ordenado por occurredAt desc (garantia do backend/DAO); sem reordenação/validação aqui.
function groupEventsByDate(events: UserActivityEvent[]): ActivityGroup[] {
	const groups: ActivityGroup[] = []
	for (const event of events) {
		const label = formatActivityGroupLabel(event.occurredAt)
		const lastGroup = groups.at(-1)
		if (lastGroup && lastGroup.label === label) {
			lastGroup.events.push(event)
		} else {
			groups.push({ label, events: [event] })
		}
	}
	return groups
}

function ActivityEventIcon({ type }: { type: UserActivityEventType }) {
	const config = ACTIVITY_ICON_CONFIG[type]
	const Icon = config.icon
	return (
		<div
			role="img"
			aria-label={config.categoryLabel}
			className={cn(
				"flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
				config.badgeClassName,
			)}
		>
			<Icon className={cn("h-4 w-4", config.iconClassName)} />
		</div>
	)
}

function ActivityGroupHeader({ label }: { label: string }) {
	return (
		<span className="font-mono text-[11px] font-semibold uppercase tracking-[.04em] text-subtle">
			{label}
		</span>
	)
}

function ActivityTabSkeleton() {
	return (
		<ul
			data-testid="activity-tab-skeleton"
			aria-label="Carregando atividade"
			className="flex flex-col gap-3"
		>
			{ACTIVITY_SKELETON_KEYS.map((key) => (
				<li key={key}>
					<Skeleton className="h-10 w-full" />
				</li>
			))}
		</ul>
	)
}

function ActivityTabError() {
	return (
		<p
			role="alert"
			className="rounded-[12px] bg-destructive-soft px-4 py-3 text-sm text-destructive"
		>
			Não foi possível carregar o histórico de atividade.
		</p>
	)
}

function ActivityPaginationFooter({
	pagination,
	onPageChange,
	isTransitioning,
}: {
	pagination: UserActivityPagination
	onPageChange?: (page: number) => void
	isTransitioning: boolean
}) {
	const summaryStart = (pagination.page - 1) * pagination.pageSize + 1
	const summaryEnd = Math.min(
		pagination.page * pagination.pageSize,
		pagination.total,
	)
	const showPagination = pagination.totalPages > 1 && onPageChange

	return (
		<footer className="mt-2 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
			<span
				data-testid="activity-summary"
				aria-live="polite"
				className="font-mono text-sm text-muted-foreground"
			>
				Exibindo {summaryStart}–{summaryEnd} de {pagination.total} atividades
			</span>
			{showPagination ? (
				<NumberedPagination
					page={pagination.page}
					totalPages={pagination.totalPages}
					onChange={onPageChange}
					testIdPrefix="activity"
					disabled={isTransitioning}
					className="mx-0 w-auto justify-start sm:justify-end"
				/>
			) : null}
		</footer>
	)
}

function ActivityTabContent({
	events,
	pagination,
	onPageChange,
	isTransitioning,
}: {
	events: UserActivityEvent[]
	pagination?: UserActivityPagination
	onPageChange?: (page: number) => void
	isTransitioning: boolean
}) {
	if (events.length === 0) {
		return (
			<EmptyState
				icon={Activity}
				title="Sem dados de atividade disponíveis"
				description="O histórico de atividade deste usuário ainda não está disponível."
			/>
		)
	}

	const groups = groupEventsByDate(events)

	return (
		<div className="flex flex-col gap-4">
			{groups.map((group) => (
				<div key={group.label} className="flex flex-col gap-3">
					<ActivityGroupHeader label={group.label} />
					<ul className="flex flex-col gap-3">
						{group.events.map((event) => (
							<li key={event.id} className="flex items-start gap-3">
								<ActivityEventIcon type={event.type} />
								<div className="flex flex-col gap-0.5">
									<span className="text-sm text-foreground">
										{event.description}
									</span>
									<span className="font-mono text-xs text-muted-foreground">
										{formatActivityTime(event.occurredAt)}
									</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			))}
			{pagination ? (
				<ActivityPaginationFooter
					pagination={pagination}
					onPageChange={onPageChange}
					isTransitioning={isTransitioning}
				/>
			) : null}
		</div>
	)
}

function ActivityTabBody({
	isLoading,
	isError,
	events,
	pagination,
	onPageChange,
	isTransitioning,
}: ActivityTabProps & { isTransitioning: boolean }) {
	if (isLoading) return <ActivityTabSkeleton />
	if (isError) return <ActivityTabError />

	return (
		<ActivityTabContent
			events={events ?? []}
			pagination={pagination}
			onPageChange={onPageChange}
			isTransitioning={isTransitioning}
		/>
	)
}

export function ActivityTab({
	events = [],
	isLoading = false,
	isError = false,
	isFetching = false,
	isPlaceholderData = false,
	pagination,
	onPageChange,
}: ActivityTabProps) {
	const isTransitioning = isFetching || isPlaceholderData

	return (
		<div data-testid="activity-tab" aria-busy={isTransitioning}>
			<ActivityTabBody
				isLoading={isLoading}
				isError={isError}
				events={events}
				pagination={pagination}
				onPageChange={onPageChange}
				isTransitioning={isTransitioning}
			/>
		</div>
	)
}
