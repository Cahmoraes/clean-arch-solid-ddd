import { randomUUID } from "node:crypto"

export type NotificationType =
	| "CHECK_IN_APPROVED"
	| "CHECK_IN_REJECTED"
	| "SECURITY_ALERT"
	| "PROMOTION"

export interface NotificationProps {
	id: string
	userId: string
	type: NotificationType
	title: string
	message: string
	gymName?: string
	reason?: string
	readAt?: Date
	deletedAt?: Date
	createdAt: Date
	updatedAt: Date
}

export interface CreateNotificationProps {
	id?: string
	userId: string
	type: NotificationType
	title: string
	message: string
	gymName?: string
	reason?: string
}

export interface RestoreNotificationProps {
	id: string
	userId: string
	type: NotificationType
	title: string
	message: string
	gymName?: string
	reason?: string
	readAt?: Date
	deletedAt?: Date
	createdAt: Date
	updatedAt: Date
}

export class Notification {
	private readonly _props: NotificationProps

	private constructor(props: NotificationProps) {
		this._props = props
	}

	public static create(props: CreateNotificationProps): Notification {
		const now = new Date()

		return new Notification({
			id: props.id ?? randomUUID(),
			userId: props.userId,
			type: props.type,
			title: props.title,
			message: props.message,
			gymName: props.gymName,
			reason: props.reason,
			readAt: undefined,
			deletedAt: undefined,
			createdAt: now,
			updatedAt: now,
		})
	}

	public static restore(props: RestoreNotificationProps): Notification {
		return new Notification(props)
	}

	public markAsRead(): void {
		if (this._props.readAt !== undefined) {
			return
		}

		const now = new Date()
		this._props.readAt = now
		this._props.updatedAt = now
	}

	public get id(): string {
		return this._props.id
	}

	public get userId(): string {
		return this._props.userId
	}

	public get type(): NotificationType {
		return this._props.type
	}

	public get title(): string {
		return this._props.title
	}

	public get message(): string {
		return this._props.message
	}

	public get gymName(): string | undefined {
		return this._props.gymName
	}

	public get reason(): string | undefined {
		return this._props.reason
	}

	public get readAt(): Date | undefined {
		return this._props.readAt
	}

	public get deletedAt(): Date | undefined {
		return this._props.deletedAt
	}

	public get createdAt(): Date {
		return this._props.createdAt
	}

	public get updatedAt(): Date {
		return this._props.updatedAt
	}

	public get isRead(): boolean {
		return this._props.readAt !== undefined
	}

	public get isDeleted(): boolean {
		return this._props.deletedAt !== undefined
	}
}
