import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"

export const NoticeAudienceValues = {
	ALL: "ALL",
	MEMBERS: "MEMBERS",
	ADMINS: "ADMINS",
} as const

export type NoticeAudienceTypes =
	(typeof NoticeAudienceValues)[keyof typeof NoticeAudienceValues]

function isNoticeAudience(value: string): value is NoticeAudienceTypes {
	return Object.values(NoticeAudienceValues).some(
		(candidate) => candidate === value,
	)
}

export class NoticeAudience {
	private constructor(private readonly audience: NoticeAudienceTypes) {}

	public static all(): NoticeAudience {
		return new NoticeAudience(NoticeAudienceValues.ALL)
	}

	public static create(
		value: string,
	): Either<InvalidNoticeError, NoticeAudience> {
		if (!isNoticeAudience(value)) {
			return failure(
				new InvalidNoticeError(
					`Audience must be one of ${Object.values(NoticeAudienceValues).join(", ")}`,
				),
			)
		}
		return success(new NoticeAudience(value))
	}

	get value(): NoticeAudienceTypes {
		return this.audience
	}
}
