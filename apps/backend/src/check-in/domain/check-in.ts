import type { Optional } from "@/@types/optional"
import type { CheckInAlreadyRejectedError } from "@/check-in/domain/error/check-in-already-rejected-error.js"
import type { CheckInTimeExceededError } from "@/check-in/domain/error/check-in-time-exceeded-error.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import type { Either } from "@/shared/domain/value-object/either"
import { ExistingId } from "@/shared/domain/value-object/existing-id"
import { Id } from "@/shared/domain/value-object/id"
import { env } from "@/shared/infra/env"

import { CheckInCreatedEvent } from "./event/check-in-created-event"
import {
	type CheckInStatus,
	CheckInStatusFactory,
	type CheckInStatusTypes,
} from "./value-object/check-in-status"

interface CheckInProps {
	id: Id
	userId: ExistingId
	gymId: ExistingId
	createdAt: Date
	validatedAt?: Date
	rejectedAt?: Date
	userLatitude: number
	userLongitude: number
}

export type CheckInCreateProps = Omit<
	Optional<CheckInProps, "id" | "createdAt">,
	"id" | "userId" | "gymId" | "rejectedAt"
> & {
	id?: string
	userId: string
	gymId: string
}

export type CheckInRestoreProps = {
	id: string
	userId: string
	gymId: string
	createdAt: Date
	validatedAt?: Date
	rejectedAt?: Date
	userLatitude: number
	userLongitude: number
}

export class CheckIn {
	private readonly _id: Id
	private readonly _userId: ExistingId
	private readonly _gymId: ExistingId
	private readonly _createdAt: Date
	private readonly _latitude: number
	private readonly _longitude: number
	private _validatedAt?: Date
	private _rejectedAt?: Date
	private _status: CheckInStatus

	private constructor(props: CheckInProps) {
		this._id = props.id
		this._userId = props.userId
		this._gymId = props.gymId
		this._createdAt = props.createdAt
		this._validatedAt = props.validatedAt
		this._rejectedAt = props.rejectedAt
		this._latitude = props.userLatitude
		this._longitude = props.userLongitude

		const statusType: CheckInStatusTypes = props.rejectedAt
			? "rejected"
			: props.validatedAt
				? "validated"
				: "pending"
		this._status = CheckInStatusFactory.create(this, statusType)
	}

	public static create(props: CheckInCreateProps): CheckIn {
		const id = Id.create(props.id)
		const userId = ExistingId.restore(props.userId)
		const gymId = ExistingId.restore(props.gymId)
		const createdAt = new Date()
		const checkIn = new CheckIn({
			id,
			userId,
			gymId,
			createdAt,
			userLatitude: props.userLatitude,
			userLongitude: props.userLongitude,
		})
		DomainEventPublisher.instance.publish(
			CheckIn.createCheckInCreatedEvent(checkIn),
		)
		return checkIn
	}

	private static createCheckInCreatedEvent(
		checkIn: CheckIn,
	): CheckInCreatedEvent {
		return new CheckInCreatedEvent({
			checkInId: checkIn.id,
			userId: checkIn.userId,
			gymId: checkIn.gymId,
		})
	}

	public static restore(props: CheckInRestoreProps): CheckIn {
		return new CheckIn({
			id: Id.create(props.id),
			userId: ExistingId.restore(props.userId),
			gymId: ExistingId.restore(props.gymId),
			createdAt: props.createdAt,
			validatedAt: props.validatedAt,
			rejectedAt: props.rejectedAt,
			userLatitude: props.userLatitude,
			userLongitude: props.userLongitude,
		})
	}

	// ── Getters ─────────────────────────────────────────────────

	get id(): string {
		return this._id.value
	}

	get userId(): string {
		return this._userId.value
	}

	get gymId(): string {
		return this._gymId.value
	}

	get createdAt(): Date {
		return this._createdAt
	}

	get validatedAt(): Date | undefined {
		return this._validatedAt
	}

	get rejectedAt(): Date | undefined {
		return this._rejectedAt
	}

	get status(): CheckInStatusTypes {
		return this._status.type
	}

	get latitude(): number {
		return this._latitude
	}

	get longitude(): number {
		return this._longitude
	}

	// ── Public domain methods ────────────────────────────────────

	public validate(): Either<
		CheckInTimeExceededError | CheckInAlreadyRejectedError,
		true
	> {
		return this._status.validate()
	}

	public reject(): Either<never, true> {
		return this._status.reject()
	}

	// ── Internal methods (called by CheckInStatus) ───────────────

	/** @internal used by CheckInStatus */
	public _isNotEligibleToValidate(): boolean {
		const now = new Date()
		const differenceInMilliseconds = now.getTime() - this._createdAt.getTime()
		const differenceInMinutes = differenceInMilliseconds / 1000 / 60
		return differenceInMinutes > env.CHECK_IN_EXPIRATION_TIME
	}

	/** @internal used by CheckInStatus */
	public _changeStatus(status: CheckInStatus): void {
		this._status = status
	}

	/** @internal used by CheckInStatus */
	public _setValidatedAt(date: Date): void {
		this._validatedAt = date
	}

	/** @internal used by CheckInStatus */
	public _clearValidatedAt(): void {
		this._validatedAt = undefined
	}

	/** @internal used by CheckInStatus */
	public _setRejectedAt(date: Date): void {
		this._rejectedAt = date
	}
}
