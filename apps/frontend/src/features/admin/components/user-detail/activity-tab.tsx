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
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import {
	formatActivityGroupLabel,
	formatActivityTime,
} from "./user-detail-format"

const ACTIVITY_SKELETON_KEYS = [0, 1, 2] as const

export type UserActivityEventType =
	| "LOGIN"
	| "PASSWORD_CHANGED"
	| "ACCOUNT_LOCKED"
	| "GOOGLE_LINKED"
	| "PROFILE_UPDATED"
	| "ROLE_CHANGED"
	| "STATUS_CHANGED"
	| "CHECK_IN"

export interface UserActivityEvent {
	id: string
	type: UserActivityEventType
	description: string
	occurredAt: string
}

export interface ActivityTabProps {
	events?: UserActivityEvent[]
	isLoading?: boolean
	isError?: boolean
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
		<span className="text-[11px] font-semibold uppercase tracking-[.04em] text-subtle">
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

export function ActivityTab({
	events = [],
	isLoading = false,
	isError = false,
}: ActivityTabProps) {
	if (isLoading) return <ActivityTabSkeleton />
	if (isError) return <ActivityTabError />

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
									<span className="text-xs text-muted-foreground">
										{formatActivityTime(event.occurredAt)}
									</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	)
}
