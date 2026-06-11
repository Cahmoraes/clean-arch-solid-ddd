import { inject, injectable } from "inversify"
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
	Prisma,
	type PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { PrismaUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work"
import { env } from "@/shared/infra/env"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

interface CreateCheckInProps {
	id: string
	created_at: Date
	validated_at: Date | null
	rejected_at: Date | null
	user_id: string
	gym_id: string
	latitude: number
	longitude: number
}

@injectable()
export class PrismaCheckInRepository implements CheckInRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(
		prismaClient: TX,
	): CheckInRepository {
		if (PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			return new PrismaCheckInRepository(prismaClient)
		}
		throw new InvalidTransactionInstance(prismaClient)
	}

	public async save(checkIn: CheckIn): Promise<SaveResponse> {
		try {
			const result = await this.prismaClient.checkIn.upsert({
				where: { id: checkIn.id },
				create: {
					id: checkIn.id,
					gym_id: checkIn.gymId,
					user_id: checkIn.userId,
					created_at: checkIn.createdAt,
					validated_at: checkIn.validatedAt ?? null,
					rejected_at: checkIn.rejectedAt ?? null,
					latitude: checkIn.latitude,
					longitude: checkIn.longitude,
				},
				update: {
					validated_at: checkIn.validatedAt ?? null,
					rejected_at: checkIn.rejectedAt ?? null,
				},
				select: { id: true },
			})
			return { id: result.id }
		} catch (error) {
			throw this.mapSaveError(error)
		}
	}

	private mapSaveError(error: unknown): unknown {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return new DuplicateCheckInError()
		}
		return error
	}

	public async checkOfById(id: string): Promise<CheckIn | null> {
		const checkInData = await this.prismaClient.checkIn.findUnique({
			where: {
				id,
			},
		})
		if (!checkInData) return null
		return this.createCheckIn({
			...checkInData,
			latitude: checkInData.latitude.toNumber(),
			longitude: checkInData.longitude.toNumber(),
		})
	}

	private createCheckIn(props: CreateCheckInProps) {
		return CheckIn.restore({
			id: props.id,
			gymId: props.gym_id,
			userId: props.user_id,
			createdAt: props.created_at,
			validatedAt: props.validated_at ?? undefined,
			rejectedAt: props.rejected_at ?? undefined,
			userLatitude: props.latitude,
			userLongitude: props.longitude,
		})
	}

	public async onSameDateOfUserId(
		userId: string,
		date: Date,
	): Promise<boolean> {
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)
		const startOfNextDay = new Date(startOfDay)
		startOfNextDay.setDate(startOfNextDay.getDate() + 1)
		const checkInOnSameDate = await this.prismaClient.checkIn.count({
			where: {
				user_id: userId,
				created_at: {
					gte: startOfDay,
					lt: startOfNextDay,
				},
			},
		})
		return checkInOnSameDate > 0
	}

	public async countByStatus(userId?: string): Promise<CheckInStats> {
		const userFilter = userId ? { user_id: userId } : {}
		const [total, pending, validated, rejected] = await Promise.all([
			this.prismaClient.checkIn.count({ where: { ...userFilter } }),
			this.prismaClient.checkIn.count({
				where: { ...userFilter, validated_at: null, rejected_at: null },
			}),
			this.prismaClient.checkIn.count({
				where: {
					...userFilter,
					validated_at: { not: null },
					rejected_at: null,
				},
			}),
			this.prismaClient.checkIn.count({
				where: { ...userFilter, rejected_at: { not: null } },
			}),
		])
		return { total, pending, validated, rejected }
	}

	public async findMany(input: FindManyInput): Promise<FindManyOutput> {
		const where = this.buildWhere(input)
		const [checkInData, total] = await Promise.all([
			this.prismaClient.checkIn.findMany({
				where,
				skip: (input.page - 1) * env.ITEMS_PER_PAGE,
				take: env.ITEMS_PER_PAGE,
				orderBy: { created_at: input.sortOrder ?? "desc" },
			}),
			this.prismaClient.checkIn.count({ where }),
		])
		const items = checkInData.map((data) =>
			this.createCheckIn({
				...data,
				latitude: data.latitude.toNumber(),
				longitude: data.longitude.toNumber(),
			}),
		)
		return { items, total }
	}

	private buildWhere(input: FindManyInput): Prisma.CheckInWhereInput {
		const where: Prisma.CheckInWhereInput = {}
		if (input.userId) {
			where.user_id = input.userId
		}
		if (input.gymName) {
			where.gym = { title: { contains: input.gymName, mode: "insensitive" } }
		}
		if (input.status === "pending") {
			where.validated_at = null
			where.rejected_at = null
		}
		if (input.status === "validated") {
			where.validated_at = { not: null }
			where.rejected_at = null
		}
		if (input.status === "rejected") {
			where.rejected_at = { not: null }
		}
		return where
	}
}
