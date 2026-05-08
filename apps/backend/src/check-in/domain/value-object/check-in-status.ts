import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import type { CheckIn } from "../check-in.js"
import { CheckInAlreadyRejectedError } from "../error/check-in-already-rejected-error.js"
import { CheckInTimeExceededError } from "../error/check-in-time-exceeded-error.js"
import { CheckInRejectedEvent } from "../event/check-in-rejected-event.js"

export const CheckInStatusTypes = {
	PENDING: "pending",
	VALIDATED: "validated",
	REJECTED: "rejected",
} as const

export type CheckInStatusTypes =
	(typeof CheckInStatusTypes)[keyof typeof CheckInStatusTypes]

export abstract class CheckInStatus {
	abstract readonly type: CheckInStatusTypes

	constructor(protected readonly checkIn: CheckIn) {}

	abstract validate(): Either<
		CheckInTimeExceededError | CheckInAlreadyRejectedError,
		true
	>
	abstract reject(): Either<never, true>
}

class PendingStatus extends CheckInStatus {
	readonly type = CheckInStatusTypes.PENDING

	public validate(): Either<CheckInTimeExceededError, true> {
		if (this.checkIn._isNotEligibleToValidate()) {
			return failure(new CheckInTimeExceededError())
		}
		this.checkIn._setValidatedAt(new Date())
		this.checkIn._changeStatus(
			CheckInStatusFactory.create(this.checkIn, CheckInStatusTypes.VALIDATED),
		)
		return success(true)
	}

	public reject(): Either<never, true> {
		this.checkIn._setRejectedAt(new Date())
		this.checkIn._changeStatus(
			CheckInStatusFactory.create(this.checkIn, CheckInStatusTypes.REJECTED),
		)
		DomainEventPublisher.instance.publish(
			new CheckInRejectedEvent({
				checkInId: this.checkIn.id,
				userId: this.checkIn.userId,
				gymId: this.checkIn.gymId,
			}),
		)
		return success(true)
	}
}

class ValidatedStatus extends CheckInStatus {
	readonly type = CheckInStatusTypes.VALIDATED

	public validate(): Either<never, true> {
		return success(true)
	}

	public reject(): Either<never, true> {
		this.checkIn._clearValidatedAt()
		this.checkIn._setRejectedAt(new Date())
		this.checkIn._changeStatus(
			CheckInStatusFactory.create(this.checkIn, CheckInStatusTypes.REJECTED),
		)
		DomainEventPublisher.instance.publish(
			new CheckInRejectedEvent({
				checkInId: this.checkIn.id,
				userId: this.checkIn.userId,
				gymId: this.checkIn.gymId,
			}),
		)
		return success(true)
	}
}

class RejectedStatus extends CheckInStatus {
	readonly type = CheckInStatusTypes.REJECTED

	public validate(): Either<CheckInAlreadyRejectedError, never> {
		return failure(new CheckInAlreadyRejectedError())
	}

	public reject(): Either<never, true> {
		return success(true)
	}
}

export class CheckInStatusFactory {
	static create(
		checkIn: CheckIn,
		statusType: CheckInStatusTypes,
	): CheckInStatus {
		switch (statusType) {
			case CheckInStatusTypes.PENDING:
				return new PendingStatus(checkIn)
			case CheckInStatusTypes.VALIDATED:
				return new ValidatedStatus(checkIn)
			case CheckInStatusTypes.REJECTED:
				return new RejectedStatus(checkIn)
			default:
				return new PendingStatus(checkIn)
		}
	}
}
