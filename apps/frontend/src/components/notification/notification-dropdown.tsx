"use client"

import { BellOff } from "lucide-react"
import type { NotificationItem as NotificationItemData } from "@/lib/notifications/use-notifications"
import { NotificationItem } from "./notification-item"

interface NotificationDropdownProps {
	notifications: NotificationItemData[]
	isLoading: boolean
	onMarkAsRead: (id: string) => void
	onMarkAllAsRead: () => void
}

function NotificationDropdownContent({
	notifications,
	isLoading,
	onMarkAsRead,
}: Pick<
	NotificationDropdownProps,
	"notifications" | "isLoading" | "onMarkAsRead"
>) {
	if (isLoading) {
		return (
			<p className="px-4 py-8 text-center text-sm text-muted-foreground">
				Carregando...
			</p>
		)
	}

	if (notifications.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
				<span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
					<BellOff className="h-5 w-5" aria-hidden="true" />
				</span>
				<p className="text-sm font-medium text-foreground">
					Nenhuma notificação
				</p>
			</div>
		)
	}

	return (
		<ul>
			{notifications.map((notification) => (
				<NotificationItem
					key={notification.id}
					notification={notification}
					onMarkAsRead={onMarkAsRead}
				/>
			))}
		</ul>
	)
}

export function NotificationDropdown({
	notifications,
	isLoading,
	onMarkAsRead,
	onMarkAllAsRead,
}: NotificationDropdownProps) {
	const hasUnreadNotifications = notifications.some(
		(notification) => notification.readAt === null,
	)

	return (
		<div
			role="dialog"
			aria-label="Notificações"
			className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden rounded-xl border border-border bg-card shadow-md"
		>
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<p className="text-sm font-semibold text-foreground">Notificações</p>
				{hasUnreadNotifications ? (
					<button
						type="button"
						onClick={onMarkAllAsRead}
						className="text-xs font-semibold text-accent transition-colors hover:text-primary-strong"
					>
						Marcar todas lidas
					</button>
				) : null}
			</div>

			<div className="max-h-[400px] overflow-y-auto">
				<NotificationDropdownContent
					notifications={notifications}
					isLoading={isLoading}
					onMarkAsRead={onMarkAsRead}
				/>
			</div>
		</div>
	)
}
