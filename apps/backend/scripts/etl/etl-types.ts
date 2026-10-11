import type { Document } from "mongodb"
import type {
	CheckIn,
	Gym,
	Notification,
	Plan,
	StripeWebhookEvent,
	Subscription,
	User,
	UserActivityEvent,
	UserNotification,
} from "@/shared/infra/database/generated/prisma/client"

export const ETL_COLLECTIONS = [
	"plans",
	"users",
	"gyms",
	"subscriptions",
	"check_ins",
	"notifications",
	"user_notifications",
	"user_activity_events",
	"stripe_webhook_events",
] as const

export type EtlCollection = (typeof ETL_COLLECTIONS)[number]

export interface EtlRows {
	plans: Plan
	users: User
	gyms: Gym
	subscriptions: Subscription
	check_ins: CheckIn
	notifications: Notification
	user_notifications: UserNotification
	user_activity_events: UserActivityEvent
	stripe_webhook_events: StripeWebhookEvent
}

export interface EtlSource {
	readBatch<K extends EtlCollection>(
		collection: K,
		afterId: string | undefined,
		size: number,
	): Promise<EtlRows[K][]>
	count(collection: EtlCollection): Promise<number>
}

export interface EtlExclusion {
	collection: EtlCollection
	id: string
	reason: string
}

export interface EtlCollectionReport {
	sourceCount: number
	copied: number
	excluded: number
	mongoCount: number
	sampleSize: number
	sampleMismatches: string[]
}

export interface EtlReport {
	generatedAt: string
	ok: boolean
	collections: Record<EtlCollection, EtlCollectionReport>
	orphans: EtlExclusion[]
	duplicateCheckIns: EtlExclusion[]
	duplicateUserNotifications: EtlExclusion[]
}

// Every copied document is keyed by the Postgres UUID, never by an ObjectId.
export type EtlDocument = Document & { _id: string }
