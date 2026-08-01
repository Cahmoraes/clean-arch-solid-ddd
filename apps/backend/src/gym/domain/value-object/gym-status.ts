import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { GymAlreadyActivatedError } from "../error/gym-already-activated-error.js"
import { GymAlreadyDeactivatedError } from "../error/gym-already-deactivated-error.js"
import type { Gym } from "../gym.js"

export const GymStatusTypes = {
	ACTIVATED: "activated",
	DEACTIVATED: "deactivated",
} as const

export type GymStatusTypes =
	(typeof GymStatusTypes)[keyof typeof GymStatusTypes]

export abstract class GymStatus {
	abstract readonly type: GymStatusTypes
	constructor(protected readonly gym: Gym) {}

	abstract activate(): Either<GymAlreadyActivatedError, void>
	abstract deactivate(): Either<GymAlreadyDeactivatedError, void>
}

class ActivatedStatus extends GymStatus {
	readonly type: GymStatusTypes = "activated"

	public activate(): Either<GymAlreadyActivatedError, void> {
		return failure(new GymAlreadyActivatedError())
	}

	public deactivate(): Either<GymAlreadyDeactivatedError, void> {
		const gymStatus = GymStatusFactory.create(this.gym, "deactivated")
		this.gym._changeStatus(gymStatus)
		return success(undefined)
	}
}

class DeactivatedStatus extends GymStatus {
	readonly type: GymStatusTypes = "deactivated"

	public activate(): Either<GymAlreadyActivatedError, void> {
		const gymStatus = GymStatusFactory.create(this.gym, "activated")
		this.gym._changeStatus(gymStatus)
		return success(undefined)
	}

	public deactivate(): Either<GymAlreadyDeactivatedError, void> {
		return failure(new GymAlreadyDeactivatedError())
	}
}

export class GymStatusFactory {
	static create(gym: Gym, statusType: GymStatusTypes): GymStatus {
		switch (statusType) {
			case "activated":
				return new ActivatedStatus(gym)
			case "deactivated":
				return new DeactivatedStatus(gym)
			default:
				throw new Error(`Unrecognized gym status: ${statusType}`)
		}
	}
}
