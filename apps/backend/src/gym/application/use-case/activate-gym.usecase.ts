import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { GymAlreadyActivatedError } from "../../domain/error/gym-already-activated-error"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { GymRepository } from "../repository/gym-repository"

export interface ActivateGymUseCaseInput {
	gymId: string
}

export type ActivateGymUseCaseOutput = Either<
	GymNotFoundError | GymAlreadyActivatedError,
	void
>

@injectable()
export class ActivateGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: ActivateGymUseCaseInput,
	): Promise<ActivateGymUseCaseOutput> {
		// admin deve localizar academia independentemente do status para reativar e obter erro correto de conflito
		const gym = await this.gymRepository.gymOfId(input.gymId, {
			includeInactive: true,
		})
		if (!gym) return failure(new GymNotFoundError())
		const activateResult = gym.activate()
		if (activateResult.isFailure()) return failure(activateResult.value)
		await this.gymRepository.update(gym)
		return success(undefined)
	}
}
