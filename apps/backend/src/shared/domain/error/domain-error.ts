export const ERROR_KINDS = [
	"conflict",
	"not-found",
	"unauthorized",
	"forbidden",
	"validation",
] as const

export type ErrorKind = (typeof ERROR_KINDS)[number]

export abstract class DomainError extends Error {
	public abstract readonly kind: ErrorKind
}
