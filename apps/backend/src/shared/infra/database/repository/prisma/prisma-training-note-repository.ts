import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import {
	Prisma,
	type PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { PrismaUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { TrainingNotesRepository } from "@/training-notes/application/repository/training-note-repository"
import { TrainingNote } from "@/training-notes/domain/entity/training-note"
import { DuplicateTrainingNoteError } from "@/training-notes/domain/error/duplicate-training-note-error"

function toDate(data: string): Date {
	return new Date(`${data}T00:00:00.000Z`)
}

function toData(data: Date): string {
	return data.toISOString().slice(0, 10)
}

type TrainingNoteRow = {
	id: string
	userId: string
	data: Date
	texto: string
	createdAt: Date
	updatedAt: Date
}

@injectable()
export class PrismaTrainingNoteRepository implements TrainingNotesRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(
		prismaClient: TX,
	): TrainingNotesRepository {
		if (PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			return new PrismaTrainingNoteRepository(prismaClient)
		}
		throw new InvalidTransactionInstance(prismaClient)
	}

	public async save(
		note: TrainingNote,
	): Promise<Either<DuplicateTrainingNoteError, void>> {
		try {
			await this.prismaClient.trainingNote.create({
				data: {
					id: note.id,
					userId: note.userId,
					data: toDate(note.data),
					texto: note.texto,
					createdAt: note.createdAt,
					updatedAt: note.updatedAt,
				},
			})
			return success(undefined)
		} catch (error) {
			return this.mapSaveError(error)
		}
	}

	private mapSaveError(
		error: unknown,
	): Either<DuplicateTrainingNoteError, void> {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return failure(new DuplicateTrainingNoteError())
		}
		throw error
	}

	public async findByUserIdAndDate(
		userId: string,
		data: string,
	): Promise<TrainingNote | null> {
		const row = await this.prismaClient.trainingNote.findFirst({
			where: { userId, data: toDate(data) },
		})
		if (!row) return null
		return this.toDomain(row)
	}

	public async listByUserIdAndRange(
		userId: string,
		de: string,
		ate: string,
	): Promise<TrainingNote[]> {
		const rows = await this.prismaClient.trainingNote.findMany({
			where: { userId, data: { gte: toDate(de), lte: toDate(ate) } },
			orderBy: { data: "asc" },
		})
		return rows.map((row) => this.toDomain(row))
	}

	public async deleteByUserIdAndDate(
		userId: string,
		data: string,
	): Promise<void> {
		await this.prismaClient.trainingNote.deleteMany({
			where: { userId, data: toDate(data) },
		})
	}

	private toDomain(row: TrainingNoteRow): TrainingNote {
		return TrainingNote.restore({
			id: row.id,
			userId: row.userId,
			data: toData(row.data),
			texto: row.texto,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		})
	}
}
