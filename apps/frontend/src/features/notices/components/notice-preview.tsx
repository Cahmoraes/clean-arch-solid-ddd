"use client"

import { useId } from "react"
import { NotificationItem } from "@/components/notification/notification-item"
import type { NotificationItem as NotificationItemData } from "@/lib/notifications/use-notifications"

export interface NoticePreviewProps {
	title: string
	message: string
}

const PREVIEW_NOTIFICATION_ID = "notice-preview"
const EMPTY_STATE_TEXT =
	"Digite o título e a mensagem para ver a pré-visualização."

const ignoreMarkAsRead = (): void => undefined

export function NoticePreview({ title, message }: NoticePreviewProps) {
	const labelId = useId()
	const createdAt = new Date().toISOString()
	const isEmpty = title.trim() === "" && message.trim() === ""
	const notification: NotificationItemData = {
		id: PREVIEW_NOTIFICATION_ID,
		type: "NOTICE",
		title,
		message,
		gymName: null,
		reason: null,
		readAt: null,
		createdAt,
	}

	return (
		<section
			aria-labelledby={labelId}
			className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-surface-2 p-4"
		>
			<p
				id={labelId}
				className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
			>
				Como o usuário verá
			</p>
			{isEmpty ? (
				<p className="text-sm text-muted-foreground">{EMPTY_STATE_TEXT}</p>
			) : (
				<ul
					aria-labelledby={labelId}
					className="overflow-hidden rounded-md border border-border bg-card"
				>
					<NotificationItem
						notification={notification}
						onMarkAsRead={ignoreMarkAsRead}
					/>
				</ul>
			)}
		</section>
	)
}
