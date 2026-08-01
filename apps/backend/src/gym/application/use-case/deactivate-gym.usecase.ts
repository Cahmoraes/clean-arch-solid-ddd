import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { GymAlreadyDeactivatedError } from "../../domain/error/gym-already-deactivated-error"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { GymRepository } from "../repository/gym-repository"

export interface DeactivateGymUseCaseInput {
	gymId: string
}

export type DeactivateGymUseCaseOutput = Either<
	GymNotFoundError | GymAlreadyDeactivatedError,
	void
>

@injectable()
export class DeactivateGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: DeactivateGymUseCaseInput,
	): Promise<DeactivateGymUseCaseOutput> {
		// admin deve localizar academia independentemente do status para desativar e obter erro correto de conflito
		const gym = await this.gymRepository.gymOfId(input.gymId, {
			includeInactive: true,
		})
		if (!gym) return failure(new GymNotFoundError())
		const deactivateResult = gym.deactivate()
		if (deactivateResult.isFailure()) return failure(deactivateResult.value)
		await this.gymRepository.update(gym)
		return success(undefined)
	}
}
