import { injectable } from "inversify"
import { ZodError, type z } from "zod"
import { fromError } from "zod-validation-error"
import { DomainError } from "@/shared/domain/error/domain-error.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { HandleCallbackResponse } from "@/shared/infra/server/http-server"
import type { Controller } from "./controller"
import { STATUS_BY_ERROR_KIND } from "./factory/error-kind-status.js"
import { ResponseFactory } from "./factory/response-factory"

type ControllerError = Error | Error[]

@injectable()
export abstract class BaseController implements Controller {
	protected parseRequest<T>(
		schema: z.ZodType<T>,
		data: unknown,
	): Either<Error, T> {
		const parsedResult = schema.safeParse(data)
		if (!parsedResult.success) {
			return failure(parsedResult.error)
		}
		return success(parsedResult.data)
	}

	protected createResponseError(
		result: Either<Error, unknown>,
	): HandleCallbackResponse
	protected createResponseError(
		result: Either<ControllerError, unknown>,
	): HandleCallbackResponse
	protected createResponseError(
		result: Either<ControllerError, unknown>,
	): HandleCallbackResponse {
		if (result.isSuccess()) {
			return ResponseFactory.OK({ body: result.value })
		}
		const overriddenResponse = this.mapResponseError(result.value)
		if (overriddenResponse) {
			return overriddenResponse
		}
		return this.createDefaultResponseError(result.value)
	}

	protected mapResponseError(
		_error: ControllerError,
	): HandleCallbackResponse | undefined {
		return undefined
	}

	private createDefaultResponseError(error: ControllerError) {
		if (Array.isArray(error)) {
			return this.createUnprocessableEntity(error)
		}
		if (error instanceof ZodError) {
			return this.createBadRequest(error)
		}
		return this.createResponseByStatus(error)
	}

	private createBadRequest(error: ZodError) {
		return ResponseFactory.BAD_REQUEST({
			message: fromError(error).message,
		})
	}

	private createResponseByStatus(error: Error) {
		if (error instanceof DomainError) {
			return ResponseFactory.create({
				status: STATUS_BY_ERROR_KIND[error.kind],
				message: error.message,
			})
		}
		return ResponseFactory.INTERNAL_SERVER_ERROR({
			message: error.message,
		})
	}

	private createUnprocessableEntity(error: Error | Error[]) {
		return ResponseFactory.UNPROCESSABLE_ENTITY({
			message: Array.isArray(error)
				? this.joinErrorMessages(error)
				: error.message,
		})
	}

	private joinErrorMessages(errors: Error[]): string {
		return errors.map((error) => error.message).join(", ")
	}

	abstract init(): Promise<void>
}
