import { type Collection, type Document, MongoClient } from "mongodb"
import { MongoTransactionsUnsupportedError } from "@/shared/infra/errors/mongo-transactions-unsupported-error"
import { MongoUnavailableError } from "@/shared/infra/errors/mongo-unavailable-error"

const SERVER_SELECTION_TIMEOUT_MS = 5000

export const COLLECTIONS = {
	USERS: "users",
	GYMS: "gyms",
	CHECK_INS: "check_ins",
	SUBSCRIPTIONS: "subscriptions",
	PLANS: "plans",
	STRIPE_WEBHOOK_EVENTS: "stripe_webhook_events",
	NOTIFICATIONS: "notifications",
	USER_NOTIFICATIONS: "user_notifications",
	USER_ACTIVITY_EVENTS: "user_activity_events",
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]

export function supportsTransactions(hello: Document): boolean {
	return typeof hello.setName === "string" || hello.msg === "isdbgrid"
}

export class MongoConnection {
	private readonly mongoClient: MongoClient

	constructor(
		url: string,
		private readonly dbName?: string,
	) {
		this.mongoClient = new MongoClient(url, {
			serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
		})
	}

	public async connect(): Promise<void> {
		try {
			await this.mongoClient.connect()
			await this.ping()
		} catch (error) {
			throw new MongoUnavailableError({ cause: error })
		}
	}

	public async ping(): Promise<void> {
		await this.mongoClient.db(this.dbName).command({ ping: 1 })
	}

	public async assertTransactionsSupported(): Promise<void> {
		const hello = await this.mongoClient
			.db(this.dbName)
			.admin()
			.command({ hello: 1 })
		if (!supportsTransactions(hello)) {
			throw new MongoTransactionsUnsupportedError()
		}
	}

	public async ensureIndexes(): Promise<void> {
		await Promise.all([
			this.collection(COLLECTIONS.USERS).createIndexes([
				{ key: { email: 1 }, name: "users_email_unique", unique: true },
				{
					key: { google_id: 1 },
					name: "users_google_id_unique",
					unique: true,
					partialFilterExpression: { google_id: { $type: "string" } },
				},
				{
					key: { billing_customer_id: 1 },
					name: "users_billing_customer_id_unique",
					unique: true,
					partialFilterExpression: {
						billing_customer_id: { $type: "string" },
					},
				},
			]),
			this.collection(COLLECTIONS.GYMS).createIndexes([
				{ key: { cnpj: 1 }, name: "gyms_cnpj_unique", unique: true },
				{ key: { location: "2dsphere" }, name: "gyms_location_2dsphere" },
			]),
			this.collection(COLLECTIONS.CHECK_INS).createIndexes([
				{
					key: { user_id: 1, dayKey: 1 },
					name: "check_ins_user_day_unique",
					unique: true,
				},
				{
					key: { user_id: 1, created_at: -1 },
					name: "check_ins_user_created_at",
				},
			]),
			this.collection(COLLECTIONS.SUBSCRIPTIONS).createIndexes([
				{
					key: { billing_subscription_id: 1 },
					name: "subscriptions_billing_subscription_id_unique",
					unique: true,
				},
				{
					key: { user_id: 1 },
					name: "subscriptions_user_id_active_unique",
					unique: true,
					partialFilterExpression: { status: "active" },
				},
			]),
			this.collection(COLLECTIONS.STRIPE_WEBHOOK_EVENTS).createIndexes([
				{
					key: { event_id: 1 },
					name: "stripe_webhook_events_event_id_unique",
					unique: true,
				},
			]),
			this.collection(COLLECTIONS.NOTIFICATIONS).createIndexes([
				{ key: { user_id: 1 }, name: "notifications_user_id" },
			]),
			this.collection(COLLECTIONS.USER_NOTIFICATIONS).createIndexes([
				{ key: { user_id: 1 }, name: "user_notifications_user_id" },
			]),
			this.collection(COLLECTIONS.USER_ACTIVITY_EVENTS).createIndexes([
				{
					key: { user_id: 1, occurred_at: -1 },
					name: "user_activity_events_user_occurred_at",
				},
			]),
		])
	}

	public collection<T extends Document>(name: string): Collection<T> {
		return this.mongoClient.db(this.dbName).collection<T>(name)
	}

	public client(): MongoClient {
		return this.mongoClient
	}

	public async disconnect(): Promise<void> {
		await this.mongoClient.close()
	}
}
