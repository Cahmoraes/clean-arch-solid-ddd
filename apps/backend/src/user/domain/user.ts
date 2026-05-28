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
import type { UserMissingAuthenticationMethodError } from "./error/user-missing-authentication-method-error.js"
import { GoogleAccountLinkedEvent } from "./event/google-account-linked-event.js"
import { PasswordChangedEvent } from "./event/password-changed-event"
import { UserAssignedBillingCustomerIdEvent } from "./event/user-assigned-billing-customer-id-event"
import { UserProfileUpdatedEvent } from "./event/user-profile-updated-event"
import { UserCreator } from "./user-creator.js"
import { Email } from "./value-object/email"
import {
	GoogleId,
	type InvalidGoogleIdError,
} from "./value-object/google-id.js"
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
	password?: Password
	googleId?: GoogleId
	role: Role
	createdAt: Date
	updatedAt?: Date
	status: StatusTypes
	billingCustomerId?: string
	isSuperAdmin?: boolean
}

export interface CreateUserDto {
	id?: string | null
	name: string
	email: string
	password?: string
	googleId?: string
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
	password?: string
	googleId?: string
	role: RoleTypes
	status: StatusTypes
	createdAt: Date
	updatedAt?: Date
	billingCustomerId?: string
	isSuperAdmin?: boolean
}

export type UserUpdateProps = Partial<Pick<CreateUserDto, "name" | "email">>

export type ValidatedUserProps = {
	name: Name
	email: Email
	password?: Password
	googleId?: GoogleId
}

export type UserValidationErrors =
	| ValidationError
	| InvalidNameLengthError
	| InvalidEmailError
	| InvalidGoogleIdError
	| UserMissingAuthenticationMethodError

export class User extends Observable {
	private _id: Id
	private _name: Name
	private _email: Email
	private _password?: Password
	private _googleId?: GoogleId
	private _role: Role
	private _createdAt: Date
	private _updatedAt?: Date
	private _status: UserStatus
	private _billingCustomerId?: string
	private _isSuperAdmin: boolean

	private constructor(props: UserConstructor) {
		super()
		this._id = props.id
		this._name = props.name
		this._email = props.email
		this._password = props.password
		this._googleId = props.googleId
		this._role = props.role
		this._createdAt = props.createdAt
		this._updatedAt = props.updatedAt
		this._status = UserStatusFactory.create(this, props.status)
		this._billingCustomerId = props.billingCustomerId
		this._isSuperAdmin = props.isSuperAdmin ?? false
	}

	public static async create(
		createUserDto: CreateUserDto,
	): Promise<Either<UserValidationErrors[], User>> {
		const userConstructor = await new UserCreator(createUserDto).execute()
		if (userConstructor.isFailure()) {
			return failure(userConstructor.value)
		}
		return success(new User(userConstructor.value))
	}

	private static validateNameAndEmail(
		name: string,
		email: string,
	): Either<UserValidationErrors[], { name: Name; email: Email }> {
		const nameResult = Name.create(name)
		const emailResult = Email.create(email)
		const result = Result.combine([nameResult, emailResult])
		if (result.not.valid) return failure(result.errors)
		return success({
			name: nameResult.forceSuccess().value,
			email: emailResult.forceSuccess().value,
		})
	}

	public static restore(userRestoreProps: UserRestore): User {
		return new User({
			id: Id.restore(userRestoreProps.id),
			email: Email.restore(userRestoreProps.email),
			name: Name.restore(userRestoreProps.name),
			password: userRestoreProps.password
				? Password.restore(userRestoreProps.password)
				: undefined,
			googleId: userRestoreProps.googleId
				? GoogleId.restore(userRestoreProps.googleId)
				: undefined,
			role: Role.restore(userRestoreProps.role),
			createdAt: userRestoreProps.createdAt,
			updatedAt: userRestoreProps.updatedAt,
			status: userRestoreProps.status,
			billingCustomerId: userRestoreProps.billingCustomerId,
			isSuperAdmin: userRestoreProps.isSuperAdmin ?? false,
		})
	}

	get id(): string {
		return this._id.value
	}

	get name(): string {
		return this._name.value
	}

	get email(): string {
		return this._email.value
	}

	get googleId(): string | undefined {
		return this._googleId?.value
	}

	get password(): string | undefined {
		return this._password?.value
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

	get isSuperAdmin(): boolean {
		return this._isSuperAdmin
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
		if (!this._password) return Promise.resolve(false)
		return this._password.compare(aString)
	}

	public linkGoogleAccount(googleId: GoogleId): void {
		this._googleId = googleId
		this.refreshUpdatedAt()
		const event = new GoogleAccountLinkedEvent({
			userEmail: this.email,
			googleId: googleId.value,
		})
		this.notify(event)
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

	public updateProfile(
		input: UserUpdateProps,
	): Either<UserValidationErrors[], null> {
		const validationResult = User.validateNameAndEmail(
			input.name ?? this.name,
			input.email ?? this.email,
		)
		if (validationResult.isFailure()) {
			return failure(validationResult.value)
		}
		this._name = validationResult.value.name
		this._email = validationResult.value.email
		void this.refreshUpdatedAt()
		const event = new UserProfileUpdatedEvent({
			email: this.email,
			name: this.name,
		})
		this.notify(event)
		return success(null)
	}

	public _changeStatus(userStatus: UserStatus): void {
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

	public lock(): void {
		this._status.lock()
	}

	public get isLocked(): boolean {
		return this._status.type === StatusTypes.LOCKED
	}

	public updateRole(role: RoleTypes): void {
		this._role = Role.restore(role)
		this.refreshUpdatedAt()
	}
}
