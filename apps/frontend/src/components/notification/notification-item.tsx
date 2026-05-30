"use client"

import { CheckCircle, ShieldAlert, Tag, XCircle } from "lucide-react"
import { cn } from "@/lib/cn"
import type { NotificationItem as NotificationItemData } from "@/lib/notifications/use-notifications"

interface NotificationItemProps {
	notification: NotificationItemData
	onMarkAsRead: (id: string) => void
}

type NotificationIcon = typeof CheckCircle

const NOTIFICATION_TYPE_STYLE: Record<
	NotificationItemData["type"],
	{ icon: NotificationIcon; iconClassName: string }
> = {
	CHECK_IN_APPROVED: {
		icon: CheckCircle,
		iconClassName: "bg-success-soft text-success",
	},
	CHECK_IN_REJECTED: {
		icon: XCircle,
		iconClassName: "bg-destructive-soft text-destructive",
	},
	SECURITY_ALERT: {
		icon: ShieldAlert,
		iconClassName: "bg-warning-soft text-warning",
	},
	PROMOTION: {
		icon: Tag,
		iconClassName: "bg-accent/15 text-accent",
	},
}

function formatRelativeTime(dateStr: string): string {
	const date = new Date(dateStr)
	const diffInMs = Date.now() - date.getTime()

	if (Number.isNaN(date.getTime()) || diffInMs < 60_000) return "agora"

	const diffInMinutes = Math.floor(diffInMs / 60_000)
	if (diffInMinutes < 60) return `${diffInMinutes}m atrás`

	const diffInHours = Math.floor(diffInMinutes / 60)
	if (diffInHours < 24) return `${diffInHours}h atrás`

	const diffInDays = Math.floor(diffInHours / 24)
	return `${diffInDays}d atrás`
}

export function NotificationItem({
	notification,
	onMarkAsRead,
}: NotificationItemProps) {
	const notificationTypeStyle = NOTIFICATION_TYPE_STYLE[notification.type]
	const Icon = notificationTypeStyle.icon
	const isUnread = notification.readAt === null

	function handleClick() {
		if (!isUnread) return
		onMarkAsRead(notification.id)
	}

	return (
		<li>
			<button
				type="button"
				onClick={handleClick}
				className={cn(
					"flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0",
					isUnread ? "hover:bg-surface-2" : "opacity-60",
				)}
			>
				<span
					className={cn(
						"inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
						notificationTypeStyle.iconClassName,
					)}
				>
					<Icon className="h-4 w-4" aria-hidden="true" />
				</span>

				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-3">
						<p className="line-clamp-1 text-sm font-semibold text-foreground">
							{notification.title}
						</p>
						<span className="flex-shrink-0 text-xs text-muted-foreground">
							{formatRelativeTime(notification.createdAt)}
						</span>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						{notification.message}
					</p>
				</div>

				{isUnread ? (
					<span
						className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent"
						aria-hidden="true"
					/>
				) : null}
			</button>
		</li>
	)
}
