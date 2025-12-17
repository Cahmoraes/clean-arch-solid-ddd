import type { Optional } from "@/@types/optional"
import { CheckInTimeExceededError } from "@/check-in/domain/error/check-in-time-exceeded-error"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { ExistingId } from "@/shared/domain/value-object/existing-id"
import { Id } from "@/shared/domain/value-object/id"
import { env } from "@/shared/infra/env"

import { CheckInCreatedEvent } from "./event/check-in-created-event"

interface CheckInProps {
	id: Id
	userId: ExistingId
	gymId: ExistingId
	createdAt: Date
	validatedAt?: Date
	userLatitude: number
	userLongitude: number
	isValidated: boolean
}

export type CheckInCreateProps = Omit<
	Optional<CheckInProps, "id" | "createdAt">,
	"id" | "userId" | "gymId" | "isValidated"
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
	userLatitude: number
	userLongitude: number
	isValidated: boolean
}

export class CheckIn {
	private readonly _id: Id
	private readonly _userId: ExistingId
	private readonly _gymId: ExistingId
	private readonly _createdAt: Date
	private readonly _latitude: number
	private readonly _longitude: number
	private _isValidated: boolean
	private _validatedAt?: Date

	private constructor(props: CheckInProps) {
		this._id = props.id
		this._userId = props.userId
		this._gymId = props.gymId
		this._createdAt = props.createdAt
		this._validatedAt = props.validatedAt
		this._latitude = props.userLatitude
		this._longitude = props.userLongitude
		this._isValidated = props.isValidated
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
			isValidated: false,
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
			// biome-ignore lint/style/noNonNullAssertion: Neste ponto o id existe
			checkInId: checkIn.id!,
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
			userLatitude: props.userLatitude,
			userLongitude: props.userLongitude,
			isValidated: props.isValidated,
		})
	}

	get id(): string | null {
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

	set validatedAt(date: Date) {
		this._validatedAt = date
	}

	get latitude(): number {
		return this._latitude
	}

	get longitude(): number {
		return this._longitude
	}

	get isValidated(): boolean {
		return this._isValidated
	}

	public validate(): Either<CheckInTimeExceededError, true> {
		if (this.isNotEligibleToValidate()) {
			return failure(new CheckInTimeExceededError())
		}
		this._validatedAt = new Date()
		this._isValidated = true
		return success(true)
	}

	private isNotEligibleToValidate(): boolean {
		const now = new Date()
		const differenceInMilliseconds = now.getTime() - this._createdAt.getTime()
		const differenceInMinutes = differenceInMilliseconds / 1000 / 60
		return differenceInMinutes > env.CHECK_IN_EXPIRATION_TIME
	}
}
