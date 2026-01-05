import bcrypt from "bcryptjs"
import { z } from "zod"
import { fromError, type ValidationError } from "zod-validation-error"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { env } from "@/shared/infra/env"

const PasswordSchema = z.string().min(6)
export type PasswordData = z.infer<typeof PasswordSchema>

export class Password {
	private constructor(private readonly _value: string) {}

	public static async create(
		aString: string,
	): Promise<Either<ValidationError, Password>> {
		const passwordOrError = Password.validate(aString)
		if (passwordOrError.isFailure()) {
			return failure(fromError(passwordOrError.value))
		}
		const salt = await bcrypt.genSalt(env.PASSWORD_SALT)
		const hashedPassword = await bcrypt.hash(passwordOrError.value, salt)
		return success(new Password(hashedPassword))
	}

	private static validate(
		rawPassword: string,
	): Either<ValidationError, string> {
		const parsedPasswordResult = PasswordSchema.safeParse(rawPassword)
		if (!parsedPasswordResult.success) {
			return failure(fromError(parsedPasswordResult.error))
		}
		return success(parsedPasswordResult.data)
	}

	public static restore(hashedPassword: string): Password {
		return new Password(hashedPassword)
	}

	get value(): string {
		return this._value
	}

	public async compare(aString: string): Promise<boolean> {
		return bcrypt.compare(aString, this._value)
	}
}
