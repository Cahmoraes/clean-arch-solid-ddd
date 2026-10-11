import { isDeepStrictEqual } from "node:util"
import type { AnyBulkWriteOperation, Collection } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	mapCheckIn,
	mapGym,
	mapNotification,
	mapPlan,
	mapStripeWebhookEvent,
	mapSubscription,
	mapUser,
	mapUserActivityEvent,
	mapUserNotification,
} from "./collection-mappers"
import type {
	EtlCollection,
	EtlCollectionReport,
	EtlDocument,
	EtlExclusion,
	EtlReport,
	EtlRows,
	EtlSource,
} from "./etl-types"

const DEFAULT_BATCH_SIZE = 500
const DEFAULT_SAMPLE_SIZE = 20

export interface EtlOptions {
	source: EtlSource
	connection: MongoConnection
	batchSize?: number
	sampleSize?: number
}

export class EtlBatchError extends Error {
	constructor(
		readonly collection: EtlCollection,
		readonly afterId: string | undefined,
		options: ErrorOptions,
	) {
		super(
			`ETL failed on ${collection} in the batch after id ${afterId ?? "(start)"}; run it again to resume`,
			options,
		)
		this.name = "EtlBatchError"
	}
}

interface ParentSets {
	plans: Set<string>
	users: Set<string>
	gyms: Set<string>
	notifications: Set<string>
}

interface EtlContext {
	parents: ParentSets
	checkInDays: Map<string, string>
}

interface Exclusion {
	kind: "orphan" | "duplicate-check-in"
	reason: string
}

interface CollectionSpec<K extends EtlCollection> {
	name: K
	mongoName: string
	parentSet?: keyof ParentSets
	map(row: EtlRows[K]): EtlDocument
	// Decides whether a row is left out of the copy. It also records what later rows depend on.
	decide(row: EtlRows[K], context: EtlContext): Exclusion | undefined
}

function missingParent(
	parents: Set<string>,
	parentName: string,
	id: string,
): Exclusion | undefined {
	return parents.has(id)
		? undefined
		: { kind: "orphan", reason: `missing parent ${parentName}/${id}` }
}

const planSpec: CollectionSpec<"plans"> = {
	name: "plans",
	mongoName: COLLECTIONS.PLANS,
	parentSet: "plans",
	map: mapPlan,
	decide: () => undefined,
}

const userSpec: CollectionSpec<"users"> = {
	name: "users",
	mongoName: COLLECTIONS.USERS,
	parentSet: "users",
	map: mapUser,
	decide: () => undefined,
}

const gymSpec: CollectionSpec<"gyms"> = {
	name: "gyms",
	mongoName: COLLECTIONS.GYMS,
	parentSet: "gyms",
	map: mapGym,
	decide: () => undefined,
}

const subscriptionSpec: CollectionSpec<"subscriptions"> = {
	name: "subscriptions",
	mongoName: COLLECTIONS.SUBSCRIPTIONS,
	map: mapSubscription,
	decide: (row, { parents }) =>
		missingParent(parents.users, "users", row.user_id) ??
		(row.plan_id
			? missingParent(parents.plans, "plans", row.plan_id)
			: undefined),
}

const checkInSpec: CollectionSpec<"check_ins"> = {
	name: "check_ins",
	mongoName: COLLECTIONS.CHECK_INS,
	map: mapCheckIn,
	decide: (row, context) => {
		const orphan =
			missingParent(context.parents.users, "users", row.user_id) ??
			missingParent(context.parents.gyms, "gyms", row.gym_id)
		if (orphan) return orphan
		const dayKey = `${row.user_id}|${row.created_at.toISOString().slice(0, 10)}`
		const keptId = context.checkInDays.get(dayKey)
		if (keptId !== undefined) {
			return {
				kind: "duplicate-check-in",
				reason: `same user and UTC day as check-in ${keptId}`,
			}
		}
		context.checkInDays.set(dayKey, row.id)
		return undefined
	},
}

const notificationSpec: CollectionSpec<"notifications"> = {
	name: "notifications",
	mongoName: COLLECTIONS.NOTIFICATIONS,
	parentSet: "notifications",
	map: mapNotification,
	decide: (row, { parents }) =>
		missingParent(parents.users, "users", row.userId),
}

const userNotificationSpec: CollectionSpec<"user_notifications"> = {
	name: "user_notifications",
	mongoName: COLLECTIONS.USER_NOTIFICATIONS,
	map: mapUserNotification,
	decide: (row, { parents }) =>
		missingParent(parents.notifications, "notifications", row.notificationId) ??
		missingParent(parents.users, "users", row.userId),
}

const activityEventSpec: CollectionSpec<"user_activity_events"> = {
	name: "user_activity_events",
	mongoName: COLLECTIONS.USER_ACTIVITY_EVENTS,
	map: mapUserActivityEvent,
	decide: (row, { parents }) =>
		missingParent(parents.users, "users", row.userId),
}

const webhookEventSpec: CollectionSpec<"stripe_webhook_events"> = {
	name: "stripe_webhook_events",
	mongoName: COLLECTIONS.STRIPE_WEBHOOK_EVENTS,
	map: mapStripeWebhookEvent,
	decide: () => undefined,
}

interface CopyDependencies {
	options: EtlOptions
	batchSize: number
	sampleSize: number
	context: EtlContext
	orphans: EtlExclusion[]
	duplicateCheckIns: EtlExclusion[]
}

interface CopyProgress {
	sample: EtlDocument[]
	copied: number
	excluded: number
}

function recordExclusion(
	collection: EtlCollection,
	id: string,
	exclusion: Exclusion,
	dependencies: CopyDependencies,
): void {
	const entry: EtlExclusion = { collection, id, reason: exclusion.reason }
	const bucket =
		exclusion.kind === "orphan"
			? dependencies.orphans
			: dependencies.duplicateCheckIns
	bucket.push(entry)
}

function toOperation<K extends EtlCollection>(
	spec: CollectionSpec<K>,
	row: EtlRows[K],
	dependencies: CopyDependencies,
	progress: CopyProgress,
): AnyBulkWriteOperation<EtlDocument> | undefined {
	const { context, sampleSize } = dependencies
	const exclusion = spec.decide(row, context)
	if (exclusion) {
		progress.excluded += 1
		recordExclusion(spec.name, row.id, exclusion, dependencies)
		return undefined
	}
	const document = spec.map(row)
	if (spec.parentSet) context.parents[spec.parentSet].add(row.id)
	if (progress.sample.length < sampleSize) progress.sample.push(document)
	progress.copied += 1
	return {
		replaceOne: {
			filter: { _id: row.id },
			replacement: document,
			upsert: true,
		},
	}
}

function buildOperations<K extends EtlCollection>(
	spec: CollectionSpec<K>,
	rows: EtlRows[K][],
	dependencies: CopyDependencies,
	progress: CopyProgress,
): AnyBulkWriteOperation<EtlDocument>[] {
	return rows
		.map((row) => toOperation(spec, row, dependencies, progress))
		.filter((operation) => operation !== undefined)
}

async function copyBatches<K extends EtlCollection>(
	spec: CollectionSpec<K>,
	dependencies: CopyDependencies,
	progress: CopyProgress,
): Promise<void> {
	const target = dependencies.options.connection.collection<EtlDocument>(
		spec.mongoName,
	)
	let afterId: string | undefined
	let rows = await readBatch(spec, afterId, dependencies)
	while (rows.length > 0) {
		try {
			const operations = buildOperations(spec, rows, dependencies, progress)
			if (operations.length > 0) await target.bulkWrite(operations)
		} catch (error) {
			throw new EtlBatchError(spec.name, afterId, { cause: error })
		}
		afterId = rows[rows.length - 1].id
		rows = await readBatch(spec, afterId, dependencies)
	}
}

async function readBatch<K extends EtlCollection>(
	spec: CollectionSpec<K>,
	afterId: string | undefined,
	dependencies: CopyDependencies,
): Promise<EtlRows[K][]> {
	try {
		return await dependencies.options.source.readBatch(
			spec.name,
			afterId,
			dependencies.batchSize,
		)
	} catch (error) {
		throw new EtlBatchError(spec.name, afterId, { cause: error })
	}
}

async function findSampleMismatches(
	target: Collection<EtlDocument>,
	sample: EtlDocument[],
): Promise<string[]> {
	const stored = await target
		.find({ _id: { $in: sample.map((document) => document._id) } })
		.toArray()
	const storedById = new Map(stored.map((document) => [document._id, document]))
	return sample
		.filter(
			(document) => !isDeepStrictEqual(storedById.get(document._id), document),
		)
		.map((document) => document._id)
}

async function copyCollection<K extends EtlCollection>(
	spec: CollectionSpec<K>,
	dependencies: CopyDependencies,
): Promise<EtlCollectionReport> {
	const { options } = dependencies
	const target = options.connection.collection<EtlDocument>(spec.mongoName)
	const progress: CopyProgress = { sample: [], copied: 0, excluded: 0 }

	await copyBatches(spec, dependencies, progress)

	return {
		sourceCount: await options.source.count(spec.name),
		copied: progress.copied,
		excluded: progress.excluded,
		mongoCount: await target.countDocuments({}),
		sampleSize: progress.sample.length,
		sampleMismatches: await findSampleMismatches(target, progress.sample),
	}
}

function isConsistent(report: EtlCollectionReport): boolean {
	return (
		report.mongoCount === report.sourceCount - report.excluded &&
		report.sampleMismatches.length === 0
	)
}

export async function runEtl(options: EtlOptions): Promise<EtlReport> {
	const dependencies: CopyDependencies = {
		options,
		batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
		sampleSize: options.sampleSize ?? DEFAULT_SAMPLE_SIZE,
		context: {
			parents: {
				plans: new Set(),
				users: new Set(),
				gyms: new Set(),
				notifications: new Set(),
			},
			checkInDays: new Map(),
		},
		orphans: [],
		duplicateCheckIns: [],
	}

	// One batch operation at a time, in dependency order, without a global transaction.
	const plans = await copyCollection(planSpec, dependencies)
	const users = await copyCollection(userSpec, dependencies)
	const gyms = await copyCollection(gymSpec, dependencies)
	const subscriptions = await copyCollection(subscriptionSpec, dependencies)
	const check_ins = await copyCollection(checkInSpec, dependencies)
	const notifications = await copyCollection(notificationSpec, dependencies)
	const user_notifications = await copyCollection(
		userNotificationSpec,
		dependencies,
	)
	const user_activity_events = await copyCollection(
		activityEventSpec,
		dependencies,
	)
	const stripe_webhook_events = await copyCollection(
		webhookEventSpec,
		dependencies,
	)

	const collections = {
		plans,
		users,
		gyms,
		subscriptions,
		check_ins,
		notifications,
		user_notifications,
		user_activity_events,
		stripe_webhook_events,
	}
	return {
		generatedAt: new Date().toISOString(),
		ok: Object.values(collections).every(isConsistent),
		collections,
		orphans: dependencies.orphans,
		duplicateCheckIns: dependencies.duplicateCheckIns,
	}
}
