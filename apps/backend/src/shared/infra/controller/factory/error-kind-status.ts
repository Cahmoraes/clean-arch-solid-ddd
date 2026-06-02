import type { ErrorKind } from "@/shared/domain/error/domain-error.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"

export const STATUS_BY_ERROR_KIND: Record<ErrorKind, number> = {
	conflict: HTTP_STATUS.CONFLICT,
	"not-found": HTTP_STATUS.NOT_FOUND,
	unauthorized: HTTP_STATUS.UNAUTHORIZED,
	forbidden: HTTP_STATUS.FORBIDDEN,
	validation: HTTP_STATUS.UNPROCESSABLE_ENTITY,
} as const
