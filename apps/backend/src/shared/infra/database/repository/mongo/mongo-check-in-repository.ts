import { inject, injectable } from "inversify"
import type { ClientSession, Collection, Filter } from "mongodb"
import { DuplicateCheckInError } from "@/check-in/application/error/duplicate-check-in-error.js"
import type {
	CheckInRepository,
	CheckInStats,
	FindManyInput,
	FindManyOutput,
	SaveResponse,
} from "@/check-in/application/repository/check-in-repository"
import { CheckIn } from "@/check-in/domain/check-in"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	duplicateKeyFields,
	isDuplicateKeyError,
} from "@/shared/infra/database/connection/mongo/mongo-duplicate-key"
import { escapeRegExp } from "@/shared/infra/database/repository/mongo/escape-regexp"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { utcDayKey } from "@/shared/infra/database/repository/utc-day-key"
import { env } from "@/shared/infra/env"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

export type CheckInDocument = {
	_id: string
	created_at: Date
	validated_at: Date | null
	rejected_at: Date | null
	latitude: number
	longitude: number
	user_id: string
	gym_id: string
	updated_at: Date
	dayKey: string
}

type GymTitleDocument = { _id: string; title: string }

@injectable()
export class MongoCheckInRepository implements CheckInRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): CheckInRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoCheckInRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(checkIn: CheckIn): Promise<SaveResponse> {
		try {
			await this.checkIns().updateOne(
				{ _id: checkIn.id },
				{
					$set: {
						validated_at: checkIn.validatedAt ?? null,
						rejected_at: checkIn.rejectedAt ?? null,
						updated_at: new Date(),
					},
					$setOnInsert: {
						user_id: checkIn.userId,
						gym_id: checkIn.gymId,
						created_at: checkIn.createdAt,
						latitude: checkIn.latitude,
						longitude: checkIn.longitude,
						dayKey: utcDayKey(checkIn.createdAt),
					},
				},
				{ upsert: true, ...sessionOptions(this.session) },
			)
			return { id: checkIn.id }
		} catch (error) {
			throw this.mapSaveError(error)
		}
	}

	public async checkOfById(id: string): Promise<CheckIn | null> {
		const document = await this.checkIns().findOne(
			{ _id: id },
			sessionOptions(this.session),
		)
		return document ? this.createCheckIn(document) : null
	}

	public async onSameDateOfUserId(
		userId: string,
		date: Date,
	): Promise<boolean> {
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)
		const startOfNextDay = new Date(startOfDay)
		startOfNextDay.setDate(startOfNextDay.getDate() + 1)
		const count = await this.checkIns().countDocuments(
			{
				user_id: userId,
				created_at: { $gte: startOfDay, $lt: startOfNextDay },
			},
			sessionOptions(this.session),
		)
		return count > 0
	}

	public async countByStatus(userId?: string): Promise<CheckInStats> {
		const userFilter: Filter<CheckInDocument> = userId
			? { user_id: userId }
			: {}
		const count = (filter: Filter<CheckInDocument>) =>
			this.checkIns().countDocuments(
				{ ...userFilter, ...filter },
				sessionOptions(this.session),
			)
		const [total, pending, validated, rejected] = await Promise.all([
			count({}),
			count({ validated_at: null, rejected_at: null }),
			count({ validated_at: { $ne: null }, rejected_at: null }),
			count({ rejected_at: { $ne: null } }),
		])
		return { total, pending, validated, rejected }
	}

	public async findMany(input: FindManyInput): Promise<FindManyOutput> {
		const filter = await this.buildFilter(input)
		const direction = input.sortOrder === "asc" ? 1 : -1
		const [documents, total] = await Promise.all([
			this.checkIns()
				.find(filter, sessionOptions(this.session))
				.sort({ created_at: direction, _id: direction })
				.skip((input.page - 1) * env.ITEMS_PER_PAGE)
				.limit(env.ITEMS_PER_PAGE)
				.toArray(),
			this.checkIns().countDocuments(filter, sessionOptions(this.session)),
		])
		return {
			items: documents.map((document) => this.createCheckIn(document)),
			total,
		}
	}

	private async buildFilter(
		input: FindManyInput,
	): Promise<Filter<CheckInDocument>> {
		const filter: Filter<CheckInDocument> = {}
		if (input.userId) filter.user_id = input.userId
		if (input.gymName) {
			const gyms = await this.connection
				.collection<GymTitleDocument>(COLLECTIONS.GYMS)
				.find(
					{ title: { $regex: escapeRegExp(input.gymName), $options: "i" } },
					{ projection: { _id: 1 }, ...sessionOptions(this.session) },
				)
				.toArray()
			filter.gym_id = { $in: gyms.map((gym) => gym._id) }
		}
		if (input.status === "pending") {
			filter.validated_at = null
			filter.rejected_at = null
		}
		if (input.status === "validated") {
			filter.validated_at = { $ne: null }
			filter.rejected_at = null
		}
		if (input.status === "rejected") {
			filter.rejected_at = { $ne: null }
		}
		return filter
	}

	private checkIns(): Collection<CheckInDocument> {
		return this.connection.collection<CheckInDocument>(COLLECTIONS.CHECK_INS)
	}

	private mapSaveError(error: unknown): unknown {
		if (
			isDuplicateKeyError(error) &&
			duplicateKeyFields(error).includes("dayKey")
		) {
			return new DuplicateCheckInError()
		}
		return error
	}

	private createCheckIn(document: CheckInDocument): CheckIn {
		return CheckIn.restore({
			id: document._id,
			gymId: document.gym_id,
			userId: document.user_id,
			createdAt: document.created_at,
			validatedAt: document.validated_at ?? undefined,
			rejectedAt: document.rejected_at ?? undefined,
			userLatitude: document.latitude,
			userLongitude: document.longitude,
		})
	}
}
