import type { ValidationError } from "zod-validation-error"
import { Result } from "@/shared/domain/result"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { Id } from "@/shared/domain/value-object/id"
import { UserMissingAuthenticationMethodError } from "./error/user-missing-authentication-method-error.js"
import type {
	CreateUserDto,
	UserConstructor,
	UserValidationErrors,
	ValidatedUserProps,
} from "./user.js"
import { Email } from "./value-object/email.js"
import {
	GoogleId,
	type InvalidGoogleIdError,
} from "./value-object/google-id.js"
import { Name } from "./value-object/name.js"
import { Password } from "./value-object/password.js"
import { Role } from "./value-object/role.js"
import { StatusTypes } from "./value-object/status.js"

export class UserCreator {
	private name!: Name
	private email!: Email
	private password?: Password
	private googleId?: GoogleId

	constructor(private readonly dto: CreateUserDto) {}

	public async execute(): Promise<
		Either<UserValidationErrors[], UserConstructor>
	> {
		const authCheck = this.checkAuthMethod()
		if (authCheck.isFailure()) return failure([authCheck.value])

		const requiredFieldsCheck = this.validateNameAndEmail()
		if (requiredFieldsCheck.isFailure()) {
			return failure(requiredFieldsCheck.value)
		}

		const passwordResult = await this.validatePassword()
		if (passwordResult?.isFailure()) {
			return failure([passwordResult.value])
		}

		const googleIdResult = this.validateGoogleId()
		if (googleIdResult?.isFailure()) {
			return failure([googleIdResult.value])
		}

		return success(this.buildConstructorProps())
	}

	private checkAuthMethod(): Either<
		UserMissingAuthenticationMethodError,
		null
	> {
		const hasPassword = this.dto.password !== undefined
		const hasGoogleId = this.dto.googleId !== undefined
		if (!hasPassword && !hasGoogleId) {
			return failure(new UserMissingAuthenticationMethodError())
		}
		return success(null)
	}

	private validateNameAndEmail(): Either<UserValidationErrors[], null> {
		const nameResult = Name.create(this.dto.name)
		const emailResult = Email.create(this.dto.email)
		const result = Result.combine([nameResult, emailResult])
		if (result.not.valid) {
			const errors: UserValidationErrors[] = []
			if (nameResult.isFailure()) errors.push(nameResult.value)
			if (emailResult.isFailure()) errors.push(emailResult.value)
			return failure(errors)
		}

		this.name = nameResult.forceSuccess().value
		this.email = emailResult.forceSuccess().value
		return success(null)
	}

	private async validatePassword(): Promise<Either<
		ValidationError,
		Password
	> | null> {
		if (this.dto.password === undefined) return null
		const result = await Password.create(this.dto.password)
		if (result.isSuccess()) this.password = result.value
		return result
	}

	private validateGoogleId(): Either<InvalidGoogleIdError, GoogleId> | null {
		if (this.dto.googleId === undefined) return null
		const result = GoogleId.create(this.dto.googleId)
		if (result.isSuccess()) this.googleId = result.value
		return result
	}

	private buildValidatedUserProps(): ValidatedUserProps {
		return {
			name: this.name,
			email: this.email,
			password: this.password,
			googleId: this.googleId,
		}
	}

	private buildConstructorProps(): UserConstructor {
		const validatedProps = this.buildValidatedUserProps()
		return {
			id: Id.create(this.dto.id),
			createdAt: this.dto.createdAt ?? new Date(),
			role: Role.create(this.dto.role),
			name: validatedProps.name,
			email: validatedProps.email,
			password: validatedProps.password,
			googleId: validatedProps.googleId,
			status: this.dto.status ?? StatusTypes.ACTIVATED,
			billingCustomerId: this.dto.billingCustomerId,
		}
	}
}
