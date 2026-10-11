import type {
	NotificationDocument,
	UserNotificationDocument,
} from "@/notification/infra/repository/mongo/mongo-notification.repository"
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
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import {
	type GymDocument,
	toGeoPoint,
} from "@/shared/infra/database/repository/mongo/mongo-gym-repository"
import type { PlanDocument } from "@/shared/infra/database/repository/mongo/mongo-plan-repository"
import type { StripeWebhookEventDocument } from "@/shared/infra/database/repository/mongo/mongo-stripe-webhook-event-repository"
import type { SubscriptionDocument } from "@/shared/infra/database/repository/mongo/mongo-subscription-repository"
import type { UserActivityEventDocument } from "@/shared/infra/database/repository/mongo/mongo-user-activity-repository"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { utcDayKey } from "@/shared/infra/database/repository/utc-day-key"

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function mapPlan(row: Plan): PlanDocument {
	return {
		_id: row.id,
		name: row.name,
		price_cents: row.price_cents,
		billing_period: row.billing_period,
		tagline: row.tagline,
		features: row.features,
		is_active: row.is_active,
		stripe_price_id: row.stripe_price_id,
		created_at: row.created_at,
		updated_at: row.updated_at,
	}
}

export function mapUser(row: User): UserDocument {
	return {
		_id: row.id,
		name: row.name,
		email: row.email,
		password_hash: row.password_hash,
		google_id: row.google_id,
		created_at: row.created_at,
		role: row.role,
		updated_at: row.updated_at,
		status: row.status,
		billing_customer_id: row.billing_customer_id,
		is_super_admin: row.is_super_admin,
		deleted_at: row.deleted_at,
	}
}

export function mapGym(row: Gym): GymDocument {
	const latitude = row.latitude.toNumber()
	const longitude = row.longitude.toNumber()
	return {
		_id: row.id,
		cnpj: row.cnpj,
		title: row.title,
		description: row.description,
		phone: row.phone,
		address: row.address,
		image_key: row.image_key,
		latitude,
		longitude,
		status: row.status,
		operating_hours: row.operating_hours ?? null,
		location: toGeoPoint(latitude, longitude),
		created_at: row.created_at,
		updated_at: row.updated_at,
	}
}

export function mapSubscription(row: Subscription): SubscriptionDocument {
	return {
		_id: row.id,
		user_id: row.user_id,
		billing_subscription_id: row.billing_subscription_id,
		customer_id: row.customer_id,
		status: row.status,
		canceled_at: row.canceled_at,
		created_at: row.created_at,
		updated_at: row.updated_at,
		plan_id: row.plan_id,
		current_period_start: row.current_period_start,
		current_period_end: row.current_period_end,
		cancel_at_period_end: row.cancel_at_period_end,
	}
}

export function mapCheckIn(row: CheckIn): CheckInDocument {
	return {
		_id: row.id,
		created_at: row.created_at,
		validated_at: row.validated_at,
		rejected_at: row.rejected_at,
		latitude: row.latitude.toNumber(),
		longitude: row.longitude.toNumber(),
		user_id: row.user_id,
		gym_id: row.gym_id,
		updated_at: row.updated_at,
		dayKey: utcDayKey(row.created_at),
	}
}

export function mapNotification(row: Notification): NotificationDocument {
	return {
		_id: row.id,
		user_id: row.userId,
		type: row.type,
		title: row.title,
		message: row.message,
		gym_name: row.gymName,
		reason: row.reason,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	}
}

export function mapUserNotification(
	row: UserNotification,
): UserNotificationDocument {
	return {
		_id: row.id,
		notification_id: row.notificationId,
		user_id: row.userId,
		read_at: row.readAt,
		deleted_at: row.deletedAt,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	}
}

export function mapUserActivityEvent(
	row: UserActivityEvent,
): UserActivityEventDocument {
	const { metadata } = row
	if (metadata !== null && !isJsonObject(metadata)) {
		throw new Error(
			`user_activity_events ${row.id}: metadata is not a JSON object`,
		)
	}
	return {
		_id: row.id,
		user_id: row.userId,
		type: row.type,
		description: row.description,
		metadata,
		occurred_at: row.occurredAt,
		created_at: row.createdAt,
	}
}

export function mapStripeWebhookEvent(
	row: StripeWebhookEvent,
): StripeWebhookEventDocument {
	return {
		_id: row.id,
		event_id: row.event_id,
		event_type: row.event_type,
		processed_at: row.processed_at,
	}
}
