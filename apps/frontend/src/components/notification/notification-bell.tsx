"use client"

import { Bell } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNotifications } from "@/lib/notifications/use-notifications"
import { NotificationDropdown } from "./notification-dropdown"

function formatUnreadCount(unreadCount: number): string {
	if (unreadCount > 99) return "99+"
	return String(unreadCount)
}

function isOutsideContainer(
	event: MouseEvent,
	container: HTMLDivElement | null,
): boolean {
	if (!(event.target instanceof Node)) return false
	if (!container) return false
	return !container.contains(event.target)
}

export function NotificationBell() {
	const [isOpen, setIsOpen] = useState<boolean>(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
		useNotifications()

	useEffect(() => {
		if (!isOpen) return

		function handleClickOutside(event: MouseEvent) {
			if (!isOutsideContainer(event, containerRef.current)) return
			setIsOpen(false)
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return
			setIsOpen(false)
		}

		document.addEventListener("mousedown", handleClickOutside)
		document.addEventListener("keydown", handleKeyDown)

		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
			document.removeEventListener("keydown", handleKeyDown)
		}
	}, [isOpen])

	const ariaLabel =
		unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				aria-label={ariaLabel}
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				onClick={() => setIsOpen((current) => !current)}
				className="relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
			>
				<Bell className="h-4 w-4" aria-hidden="true" />
				{unreadCount > 0 ? (
					<span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
						{formatUnreadCount(unreadCount)}
					</span>
				) : null}
			</button>

			{isOpen ? (
				<NotificationDropdown
					notifications={notifications}
					isLoading={isLoading}
					onMarkAsRead={(notificationId) => {
						void markAsRead(notificationId)
					}}
					onMarkAllAsRead={() => {
						void markAllAsRead()
					}}
				/>
			) : null}
		</div>
	)
}
