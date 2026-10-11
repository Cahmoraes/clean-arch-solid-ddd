import { inject, injectable } from "inversify"
import type { ClientSession, Collection, Document, Filter } from "mongodb"
import type {
	FetchGymsInput,
	FetchGymsOutput,
	GymFetchOptions,
	GymRepository,
	SaveGymResult,
} from "@/gym/application/repository/gym-repository"
import { Gym } from "@/gym/domain/gym"
import { GymStatusTypes } from "@/gym/domain/value-object/gym-status"
import { OperatingHours } from "@/gym/domain/value-object/spec-gym-dates.js"
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { escapeRegExp } from "@/shared/infra/database/repository/mongo/escape-regexp"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { env } from "@/shared/infra/env"
import { GymNotPersistedError } from "@/shared/infra/errors/gym-not-persisted-error"
import { InvalidPersistedGymError } from "@/shared/infra/errors/invalid-persisted-gym-error"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

const NEARBY_RADIUS_METERS = 10_000

export type GeoPoint = { type: "Point"; coordinates: [number, number] }

export function toGeoPoint(latitude: number, longitude: number): GeoPoint {
	return { type: "Point", coordinates: [longitude, latitude] }
}

export type GymDocument = {
	_id: string
	cnpj: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	image_key: string | null
	latitude: number
	longitude: number
	status: "activated" | "deactivated"
	operating_hours: unknown
	location: GeoPoint
	created_at: Date
	updated_at: Date
}

type MutableGymFields = Omit<
	GymDocument,
	"_id" | "cnpj" | "created_at" | "updated_at"
>

@injectable()
export class MongoGymRepository implements GymRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): GymRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoGymRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(gym: Gym): Promise<SaveGymResult> {
		const now = new Date()
		await this.gyms().insertOne(
			{
				_id: gym.id,
				cnpj: gym.cnpj,
				...this.mutableFields(gym),
				created_at: now,
				updated_at: now,
			},
			sessionOptions(this.session),
		)
		return { id: gym.id }
	}

	public async update(gym: Gym): Promise<void> {
		const result = await this.gyms().updateOne(
			{ _id: gym.id },
			{
				$set: {
					...this.mutableFields(gym),
					cnpj: gym.cnpj,
					updated_at: new Date(),
				},
			},
			sessionOptions(this.session),
		)
		if (result.matchedCount === 0) throw new GymNotPersistedError(gym.id)
	}

	public async gymOfId(
		id: string,
		options?: GymFetchOptions,
	): Promise<Gym | null> {
		const filter: Filter<GymDocument> = { _id: id }
		if (options?.includeInactive === false) {
			filter.status = GymStatusTypes.ACTIVATED
		}
		const document = await this.gyms().findOne(
			filter,
			sessionOptions(this.session),
		)
		return document ? this.createGym(document) : null
	}

	public async gymOfCNPJ(cnpj: string): Promise<Gym | null> {
		const document = await this.gyms().findOne(
			{ cnpj },
			sessionOptions(this.session),
		)
		return document ? this.createGym(document) : null
	}

	public async fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput> {
		const filter: Filter<GymDocument> = {}
		if (input.title) {
			filter.title = { $regex: escapeRegExp(input.title), $options: "i" }
		}
		if (input.includeInactive === false) {
			filter.status = GymStatusTypes.ACTIVATED
		}
		const [documents, total] = await Promise.all([
			this.gyms()
				.find(filter, sessionOptions(this.session))
				.sort({ created_at: 1, _id: 1 })
				.skip((input.page - 1) * env.ITEMS_PER_PAGE)
				.limit(env.ITEMS_PER_PAGE)
				.toArray(),
			this.gyms().countDocuments(filter, sessionOptions(this.session)),
		])
		return {
			items: documents.map((document) => this.createGym(document)),
			total,
		}
	}

	public async fetchNearbyCoord(
		coordinate: Coordinate,
		options?: GymFetchOptions,
	): Promise<Gym[]> {
		const geoNear: Document = {
			near: toGeoPoint(coordinate.latitude, coordinate.longitude),
			distanceField: "distance_meters",
			maxDistance: NEARBY_RADIUS_METERS,
			spherical: true,
		}
		if (options?.includeInactive === false) {
			geoNear.query = { status: GymStatusTypes.ACTIVATED }
		}
		const documents = await this.gyms()
			.aggregate<GymDocument>(
				[{ $geoNear: geoNear }],
				sessionOptions(this.session),
			)
			.toArray()
		return documents.map((document) => this.createGym(document))
	}

	private mutableFields(gym: Gym): MutableGymFields {
		return {
			title: gym.title,
			description: gym.description ?? null,
			phone: gym.phone ? gym.phone.toString() : null,
			address: gym.address ?? null,
			image_key: gym.imageKey ?? null,
			latitude: gym.latitude,
			longitude: gym.longitude,
			status: gym.status,
			operating_hours: gym.operatingHours?.toJSON() ?? null,
			location: toGeoPoint(gym.latitude, gym.longitude),
		}
	}

	private gyms(): Collection<GymDocument> {
		return this.connection.collection<GymDocument>(COLLECTIONS.GYMS)
	}

	private parseOperatingHours(
		rawHours: unknown,
		gymId: string,
	): OperatingHours | null {
		if (rawHours === null || rawHours === undefined) return null
		const result = OperatingHours.createFromUnknown(rawHours)
		if (result.isFailure()) {
			throw new InvalidPersistedGymError(gymId, result.value)
		}
		return result.value
	}

	private createGym(document: GymDocument): Gym {
		return Gym.restore({
			id: document._id,
			title: document.title,
			description: document.description ?? undefined,
			phone: document.phone ? document.phone : undefined,
			address: document.address ?? undefined,
			imageKey: document.image_key ?? undefined,
			latitude: document.latitude,
			longitude: document.longitude,
			cnpj: document.cnpj,
			status: document.status,
			operatingHours: this.parseOperatingHours(
				document.operating_hours,
				document._id,
			),
		})
	}
}
