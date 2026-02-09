import type { ValidationError } from "zod-validation-error"

import { Observable } from "@/shared/domain/observable"
import { Result } from "@/shared/domain/result"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { Id } from "@/shared/domain/value-object/id"

import type { InvalidEmailError } from "./error/invalid-email-error"
import type { InvalidNameLengthError } from "./error/invalid-name-length-error"
import { PasswordChangedEvent } from "./event/password-changed-event"
import { UserAssignedBillingCustomerIdEvent } from "./event/user-assigned-billing-customer-id-event"
import { UserProfileUpdatedEvent } from "./event/user-profile-updated-event"
import { Email } from "./value-object/email"
import { Name } from "./value-object/name"
import { Password } from "./value-object/password"
import { Role, type RoleTypes } from "./value-object/role"
import {
	StatusTypes,
	type UserStatus,
	UserStatusFactory,
} from "./value-object/status"

export interface UserConstructor {
	id: Id
	name: Name
	email: Email
	password: Password
	role: Role
	createdAt: Date
	updatedAt?: Date
	status: StatusTypes
	billingCustomerId?: string
}

export interface CreateUserDto {
	id?: string | null
	name: string
	email: string
	password: string
	role?: RoleTypes
	createdAt?: Date
	updatedAt?: Date
	status?: StatusTypes
	billingCustomerId?: string
}

export interface UserRestore {
	id: string
	name: string
	email: string
	password: string
	role: RoleTypes
	status: StatusTypes
	createdAt: Date
	updatedAt?: Date
	billingCustomerId?: string
}

export type UserUpdateProps = Partial<Pick<CreateUserDto, "name" | "email">>

export type ValidatedUserProps = Omit<
	UserConstructor,
	"id" | "createdAt" | "role" | "status"
>

export type UserValidationErrors =
	| ValidationError
	| InvalidNameLengthError
	| InvalidEmailError

export class User extends Observable {
	private _id: Id
	private _name: Name
	private _email: Email
	private _password: Password
	private _role: Role
	private _createdAt: Date
	private _updatedAt?: Date
	private _status: UserStatus
	private _billingCustomerId?: string

	private constructor(props: UserConstructor) {
		super()
		this._id = props.id
		this._name = props.name
		this._email = props.email
		this._password = props.password
		this._role = props.role
		this._createdAt = props.createdAt
		this._updatedAt = props.updatedAt
		this._status = UserStatusFactory.create(this, props.status)
		this._billingCustomerId = props.billingCustomerId
	}

	public static async create(
		createUserDto: CreateUserDto,
	): Promise<Either<UserValidationErrors[], User>> {
		const userValidationOutcome = await User.validate(createUserDto)
		if (userValidationOutcome.isFailure()) {
			return failure(userValidationOutcome.value)
		}
		const id = Id.create(createUserDto.id)
		const createdAt = createUserDto.createdAt ?? new Date()
		const role = Role.create(createUserDto.role)
		return success(
			new User({
				id,
				createdAt,
				role,
				name: userValidationOutcome.value.name,
				email: userValidationOutcome.value.email,
				password: userValidationOutcome.value.password,
				status: createUserDto.status ?? StatusTypes.ACTIVATED,
				billingCustomerId: createUserDto.billingCustomerId,
			}),
		)
	}

	private static async validate(
		userCreateProps: CreateUserDto,
	): Promise<Either<UserValidationErrors[], ValidatedUserProps>> {
		const nameResult = Name.create(userCreateProps.name)
		const emailResult = Email.create(userCreateProps.email)
		const passwordResult = await Password.create(userCreateProps.password)
		const result = Result.combine([nameResult, emailResult, passwordResult])
		if (!result.isValid) return failure(result.errors)
		return success({
			email: emailResult.forceSuccess().value,
			name: nameResult.forceSuccess().value,
			password: passwordResult.forceSuccess().value,
		})
	}

	public static restore(userRestoreProps: UserRestore): User {
		return new User({
			id: Id.restore(userRestoreProps.id),
			email: Email.restore(userRestoreProps.email),
			name: Name.restore(userRestoreProps.name),
			password: Password.restore(userRestoreProps.password),
			role: Role.restore(userRestoreProps.role),
			createdAt: userRestoreProps.createdAt,
			updatedAt: userRestoreProps.updatedAt,
			status: userRestoreProps.status,
			billingCustomerId: userRestoreProps.billingCustomerId,
		})
	}

	get id(): string | null {
		return this._id.value
	}

	get name(): string {
		return this._name.value
	}

	get email(): string {
		return this._email.value
	}

	get password(): string {
		return this._password.value
	}

	get role(): RoleTypes {
		return this._role.value
	}

	get createdAt(): Date {
		return this._createdAt
	}

	get status(): StatusTypes {
		return this._status.type
	}

	get updatedAt(): Date | undefined {
		return this._updatedAt
	}

	get billingCustomerId(): string | undefined {
		return this._billingCustomerId
	}

	public assignBillingCustomerId(billingCustomerId: string): void {
		if (!billingCustomerId) return
		this._billingCustomerId = billingCustomerId
		const event = new UserAssignedBillingCustomerIdEvent({
			userEmail: this.email,
		})
		this.refreshUpdatedAt()
		this.notify(event)
	}

	public get hasBillingCustomerId(): boolean {
		return !!this._billingCustomerId
	}

	private refreshUpdatedAt(): void {
		this._updatedAt = new Date()
	}

	public checkPassword(aString: string): Promise<boolean> {
		return this._password.compare(aString)
	}

	public async changePassword(
		newRawPassword: string,
	): Promise<Either<ValidationError, null>> {
		const passwordCreateResult = await Password.create(newRawPassword)
		if (passwordCreateResult.isFailure()) {
			return failure(passwordCreateResult.value)
		}
		this._password = passwordCreateResult.value
		void this.refreshUpdatedAt()
		const event = new PasswordChangedEvent({
			userName: this.name,
			userEmail: this.email,
		})
		void this.notify(event)
		return success(null)
	}

	public async updateProfile(
		input: UserUpdateProps,
	): Promise<Either<UserValidationErrors[], null>> {
		const userCreateResult = await User.create({
			id: this.id,
			name: input.name ?? this.name,
			email: input.email ?? this.email,
			password: this.password,
			role: this.role,
			createdAt: this.createdAt,
			status: this.status,
			billingCustomerId: this.billingCustomerId,
		})
		if (userCreateResult.isFailure()) {
			return failure(userCreateResult.value)
		}
		this._email = userCreateResult.value._email
		this._name = userCreateResult.value._name
		void this.refreshUpdatedAt()
		const event = new UserProfileUpdatedEvent({
			email: this.email,
			name: this.name,
		})
		this.notify(event)
		return success(null)
	}

	public changeStatus(userStatus: UserStatus): void {
		this._status = userStatus
	}

	public suspend(): void {
		this._status.suspend()
	}

	public get isSuspend(): boolean {
		return this._status.type === StatusTypes.SUSPENDED
	}

	public activate(): void {
		this._status.activate()
	}

	public get isActive(): boolean {
		return this._status.type === StatusTypes.ACTIVATED
	}
}
