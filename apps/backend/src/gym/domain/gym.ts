import type { InvalidLatitudeError } from "@/shared/domain/error/invalid-latitude-error.js"
import type { InvalidLongitudeError } from "@/shared/domain/error/invalid-longitude-error.js"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { Id } from "@/shared/domain/value-object/id.js"
import type { InvalidNameLengthError } from "@/user/domain/error/invalid-name-length-error.js"
import { Name } from "@/user/domain/value-object/name.js"
import { Phone } from "@/user/domain/value-object/phone.js"
import type { GymAlreadyActivatedError } from "./error/gym-already-activated-error.js"
import type { GymAlreadyDeactivatedError } from "./error/gym-already-deactivated-error.js"
import type { InvalidCNPJError } from "./error/invalid-cnpj-error.js"
import { CNPJ } from "./value-object/CNPJ.js"
import type { InvalidOperatingHoursError } from "./value-object/errors/invalid-operating-hours-error.js"
import {
	type GymStatus,
	GymStatusFactory,
	type GymStatusTypes,
} from "./value-object/gym-status.js"
import {
	type DayScheduleDTO,
	OperatingHours,
} from "./value-object/spec-gym-dates.js"

interface GymConstructor {
	id: Id
	cnpj: CNPJ
	title: Name
	description?: string
	phone: Phone
	coordinate: Coordinate
	address?: string
	imageKey?: string
	status: GymStatusTypes
	operatingHours?: OperatingHours | null
}

export type GymCreateProps = Omit<
	GymConstructor,
	"id" | "coordinate" | "title" | "phone" | "cnpj" | "status" | "operatingHours"
> & {
	id?: string
	phone?: string
	title: string
	latitude: number
	longitude: number
	cnpj: string
	address: string
	operatingHours?: DayScheduleDTO[] | OperatingHours | null // allow VO for factory/tests, still validates via OperatingHours.create when DTO passed
}

export type GymRestoreProps = Omit<
	GymConstructor,
	"id" | "coordinate" | "title" | "phone" | "cnpj" | "status" | "operatingHours"
> & {
	id: string
	phone?: string
	title: string
	latitude: number
	longitude: number
	cnpj: string
	address?: string
	status: GymStatusTypes
	operatingHours?: DayScheduleDTO[] | OperatingHours | null
}

export class Gym {
	private readonly _id: Id
	private readonly _title: Name
	private readonly _description?: string
	private readonly _phone?: Phone
	private readonly _coordinate: Coordinate
	private readonly _cnpj: CNPJ
	private readonly _address?: string
	private readonly _imageKey?: string
	private _status: GymStatus
	private readonly _operatingHours?: OperatingHours | null

	private constructor(gymProps: GymConstructor) {
		this._id = gymProps.id
		this._title = gymProps.title
		this._description = gymProps.description
		this._phone = gymProps.phone
		this._coordinate = gymProps.coordinate
		this._cnpj = gymProps.cnpj
		this._address = gymProps.address
		this._imageKey = gymProps.imageKey
		this._status = GymStatusFactory.create(this, gymProps.status)
		this._operatingHours = gymProps.operatingHours ?? null
	}

	public static create(
		gymProps: GymCreateProps,
	): Either<
		| InvalidNameLengthError
		| InvalidLatitudeError
		| InvalidLongitudeError
		| InvalidCNPJError
		| InvalidOperatingHoursError,
		Gym
	> {
		const id = Id.create(gymProps.id)
		const nameOrError = Name.create(gymProps.title)
		if (nameOrError.isFailure()) return failure(nameOrError.value)
		const coordinateOrError = Coordinate.create({
			latitude: gymProps.latitude,
			longitude: gymProps.longitude,
		})
		if (coordinateOrError.isFailure()) return failure(coordinateOrError.value)
		const phoneOrError = Phone.create(gymProps.phone)
		if (phoneOrError.isFailure()) return failure(phoneOrError.value)
		const cnpjOrError = CNPJ.create(gymProps.cnpj)
		if (cnpjOrError.isFailure()) return failure(cnpjOrError.value)
		const operatingHoursResult = Gym.resolveOperatingHoursForCreate(
			gymProps.operatingHours,
		)
		if (operatingHoursResult.isFailure())
			return failure(operatingHoursResult.value)
		const gym = new Gym({
			...gymProps,
			id,
			coordinate: coordinateOrError.value,
			title: nameOrError.value,
			phone: phoneOrError.value,
			cnpj: cnpjOrError.value,
			status: "activated",
			operatingHours: operatingHoursResult.value,
		})
		return success(gym)
	}

	private static resolveOperatingHoursForCreate(
		input: DayScheduleDTO[] | OperatingHours | null | undefined,
	): Either<InvalidOperatingHoursError, OperatingHours | null> {
		if (!input) return success(null)
		if (input instanceof OperatingHours) return success(input)
		if (Array.isArray(input)) return OperatingHours.create(input)
		return success(null)
	}

	private static resolveOperatingHoursForRestore(
		input: DayScheduleDTO[] | OperatingHours | null | undefined,
	): OperatingHours | null {
		if (!input) return null
		if (input instanceof OperatingHours) return input
		if (Array.isArray(input)) return OperatingHours.restore(input)
		return null
	}

	public static restore(gymProps: GymRestoreProps): Gym {
		const id = Id.restore(gymProps.id)
		const title = Name.restore(gymProps.title)
		const phone = Phone.restore(gymProps.phone)
		const coordinate = Coordinate.restore({
			latitude: gymProps.latitude,
			longitude: gymProps.longitude,
		})
		const cnpj = CNPJ.restore(gymProps.cnpj)
		return new Gym({
			...gymProps,
			id,
			coordinate,
			title,
			phone,
			cnpj,
			status: gymProps.status,
			operatingHours: Gym.resolveOperatingHoursForRestore(
				gymProps.operatingHours,
			),
		})
	}

	get id(): string {
		return this._id.value
	}

	get title(): string {
		return this._title.value
	}

	get description(): string | undefined {
		return this._description
	}

	get phone(): string | undefined {
		return this._phone?.value
	}

	get latitude(): number {
		return this._coordinate.latitude
	}

	get longitude(): number {
		return this._coordinate.longitude
	}

	get cnpj(): string {
		return this._cnpj.value
	}

	get address(): string | undefined {
		return this._address
	}

	get imageKey(): string | undefined {
		return this._imageKey
	}

	get status(): GymStatusTypes {
		return this._status.type
	}

	get operatingHours(): OperatingHours | null {
		return this._operatingHours ?? null
	}

	public _changeStatus(gymStatus: GymStatus): void {
		this._status = gymStatus
	}

	public deactivate(): Either<GymAlreadyDeactivatedError, void> {
		return this._status.deactivate()
	}

	public activate(): Either<GymAlreadyActivatedError, void> {
		return this._status.activate()
	}
}
