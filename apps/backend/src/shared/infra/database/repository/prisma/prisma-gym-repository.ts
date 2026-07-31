import type { Decimal } from "@prisma/client/runtime/client"
import { inject, injectable } from "inversify"
import type {
	FetchGymsInput,
	FetchGymsOutput,
	GymFetchOptions,
	GymRepository,
	SaveGymResult,
} from "@/gym/application/repository/gym-repository"
import { Gym } from "@/gym/domain/gym"
import { GymStatusTypes } from "@/gym/domain/value-object/gym-status"
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	Prisma,
	type PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { env } from "@/shared/infra/env"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { PrismaUnitOfWork } from "../unit-of-work/prisma-unit-of-work"

export interface GymCreateProps {
	id: string
	title: string
	description: string | null
	phone?: string | null
	address?: string | null
	image_key?: string | null
	latitude: Decimal
	longitude: Decimal
	cnpj: string
	status: "activated" | "deactivated"
}

@injectable()
export class PrismaGymRepository implements GymRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(prismaClient: TX): GymRepository {
		if (PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			return new PrismaGymRepository(prismaClient)
		}
		throw new InvalidTransactionInstance(prismaClient)
	}

	public async save(gym: Gym): Promise<SaveGymResult> {
		const result = await this.prismaClient.gym.create({
			data: {
				id: gym.id,
				title: gym.title,
				description: gym.description,
				phone: gym.phone ? gym.phone.toString() : undefined,
				address: gym.address,
				image_key: gym.imageKey ?? null,
				latitude: gym.latitude,
				longitude: gym.longitude,
				cnpj: gym.cnpj,
				status: gym.status,
			},
			select: { id: true },
		})
		return { id: result.id }
	}

	public async update(gym: Gym): Promise<void> {
		await this.prismaClient.gym.update({
			where: { id: gym.id },
			data: {
				title: gym.title,
				description: gym.description ?? null,
				phone: gym.phone ?? null,
				address: gym.address ?? null,
				image_key: gym.imageKey ?? null,
				latitude: gym.latitude,
				longitude: gym.longitude,
				cnpj: gym.cnpj,
				status: gym.status,
			},
		})
	}

	public async fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput> {
		const statusFilter =
			input.includeInactive === false
				? { status: GymStatusTypes.ACTIVATED }
				: {}
		const where: Prisma.GymWhereInput = {
			...(input.title
				? {
						title: {
							contains: input.title,
							mode: "insensitive" as const,
						},
					}
				: {}),
			...statusFilter,
		}

		const skip = (input.page - 1) * env.ITEMS_PER_PAGE
		const take = env.ITEMS_PER_PAGE

		const [gymData, total] = await Promise.all([
			this.prismaClient.gym.findMany({ where, skip, take }),
			this.prismaClient.gym.count({ where }),
		])

		return { items: gymData.map(this.createGym), total }
	}

	private createGym(props: GymCreateProps): Gym {
		return Gym.restore({
			id: props.id,
			title: props.title,
			description: props.description ?? undefined,
			phone: props.phone ? props.phone : undefined,
			address: props.address ?? undefined,
			imageKey: props.image_key ?? undefined,
			latitude: props.latitude.toNumber(),
			longitude: props.longitude.toNumber(),
			cnpj: props.cnpj,
			status: props.status,
		})
	}

	public async gymOfId(
		id: string,
		options?: GymFetchOptions,
	): Promise<Gym | null> {
		const gymData = await this.prismaClient.gym.findFirst({
			where: {
				id,
				...(options?.includeInactive === false
					? { status: GymStatusTypes.ACTIVATED }
					: {}),
			},
		})
		if (!gymData) return null
		return this.createGym(gymData)
	}

	public async fetchNearbyCoord(
		coordinate: Coordinate,
		options?: GymFetchOptions,
	): Promise<Gym[]> {
		const statusClause =
			options?.includeInactive === false
				? Prisma.sql`AND status = ${GymStatusTypes.ACTIVATED}`
				: Prisma.empty
		const gyms = await this.prismaClient.$queryRaw<GymCreateProps[]>`
      SELECT * FROM "gyms"
      WHERE ST_DistanceSphere(
        ST_MakePoint("longitude", "latitude"),
        ST_MakePoint(${coordinate.longitude}, ${coordinate.latitude})
      ) <= 10000
      ${statusClause}
    `
		return gyms.map((props) => this.createGym(props))
	}

	public async gymOfCNPJ(cnpj: string): Promise<Gym | null> {
		const gymDataOrNull = await this.prismaClient.gym.findUnique({
			where: {
				cnpj,
			},
		})
		if (!gymDataOrNull) return null
		return this.createGym(gymDataOrNull)
	}
}
