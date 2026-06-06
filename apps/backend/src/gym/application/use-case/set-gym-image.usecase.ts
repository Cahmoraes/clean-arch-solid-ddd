import { inject, injectable } from "inversify"

import { Gym } from "@/gym/domain/gym"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import { GymNotFoundError } from "../error/gym-not-found-error"
import { InvalidImageError } from "../error/invalid-image-error"
import type { GymRepository } from "../repository/gym-repository"
import type { ImageProcessor, ProcessedImage } from "../storage/image-processor"
import type { ImageStorage } from "../storage/image-storage"

export interface SetGymImageUseCaseInput {
	gymId: string
	fileBuffer: Buffer
}

export interface SetGymImageResponse {
	imageKey: string
}

export type SetGymImageUseCaseOutput = Either<
	GymNotFoundError | InvalidImageError,
	SetGymImageResponse
>

@injectable()
export class SetGymImageUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
		@inject(GYM_TYPES.Services.ImageProcessor)
		private readonly imageProcessor: ImageProcessor,
		@inject(GYM_TYPES.Services.ImageStorage)
		private readonly imageStorage: ImageStorage,
	) {}

	public async execute(
		input: SetGymImageUseCaseInput,
	): Promise<SetGymImageUseCaseOutput> {
		const gym = await this.gymRepository.gymOfId(input.gymId)
		if (!gym) return failure(new GymNotFoundError())

		const processedOrError = await this.processImage(input.fileBuffer)
		if (processedOrError.isFailure()) return failure(processedOrError.value)

		const { key } = await this.imageStorage.save(
			processedOrError.value.buffer,
			processedOrError.value.extension,
		)
		const previousKey = gym.imageKey

		await this.gymRepository.update(
			Gym.restore({
				id: gym.id,
				title: gym.title,
				description: gym.description,
				phone: gym.phone,
				latitude: gym.latitude,
				longitude: gym.longitude,
				cnpj: gym.cnpj,
				address: gym.address,
				imageKey: key,
			}),
		)

		if (previousKey) await this.imageStorage.delete(previousKey)
		return success({ imageKey: key })
	}

	private async processImage(
		buffer: Buffer,
	): Promise<Either<InvalidImageError, ProcessedImage>> {
		try {
			const processed = await this.imageProcessor.process(buffer)
			return success(processed)
		} catch {
			return failure(new InvalidImageError())
		}
	}
}
