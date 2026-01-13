import { HTTP_STATUS } from "@/shared/infra/server/http-status"

export interface ResponseInput {
	status: number
	[key: string]: any
}

export interface ResponseOutput {
	status: number
	body: any
}

export type OmitWithoutStatus = Omit<ResponseInput, "status">

export class ResponseFactory {
	public static create(input: ResponseInput): ResponseOutput {
		const { status, ...rest } = input
		return {
			status: status,
			body: this.extractBody(rest),
		}
	}

	private static extractBody(rest: any) {
		return rest.body ? rest.body : rest
	}

	public static OK(input?: OmitWithoutStatus) {
		return this.create({
			status: HTTP_STATUS.OK,
			...input,
		})
	}

	public static BAD_REQUEST(input: OmitWithoutStatus) {
		return this.create({
			status: HTTP_STATUS.BAD_REQUEST,
			...input,
		})
	}

	public static UNPROCESSABLE_ENTITY(input: OmitWithoutStatus) {
		return this.create({
			status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
			...input,
		})
	}

	public static CREATED(input: OmitWithoutStatus) {
		return this.create({
			status: HTTP_STATUS.CREATED,
			...input,
		})
	}

	public static NO_CONTENT() {
		return this.create({
			status: HTTP_STATUS.NO_CONTENT,
		})
	}

	public static INTERNAL_SERVER_ERROR(input: OmitWithoutStatus) {
		return this.create({
			status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
			...input,
		})
	}

	public static NOT_FOUND(input: OmitWithoutStatus) {
		return this.create({
			status: HTTP_STATUS.NOT_FOUND,
			...input,
		})
	}

	public static CONFLICT(input: OmitWithoutStatus) {
		return this.create({
			status: HTTP_STATUS.CONFLICT,
			...input,
		})
	}

	public static UNAUTHORIZED(input: OmitWithoutStatus) {
		return this.create({
			status: HTTP_STATUS.UNAUTHORIZED,
			...input,
		})
	}

	public static FORBIDDEN(input: OmitWithoutStatus) {
		return this.create({
			status: HTTP_STATUS.FORBIDDEN,
			...input,
		})
	}
}
