export interface JwtPayload {
	sub: string
	role: "MEMBER" | "ADMIN"
	exp: number
}

function base64UrlDecode(input: string): string {
	const padded = input.replace(/-/g, "+").replace(/_/g, "/")
	const padLen = padded.length % 4
	const normalized = padLen === 0 ? padded : padded + "=".repeat(4 - padLen)
	if (typeof atob === "function") {
		return atob(normalized)
	}
	return Buffer.from(normalized, "base64").toString("binary")
}

function toUtf8(binary: string): string {
	return decodeURIComponent(
		Array.from(binary)
			.map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
			.join(""),
	)
}

function parsePayload(segment: string): Record<string, unknown> | null {
	try {
		return JSON.parse(toUtf8(base64UrlDecode(segment))) as Record<
			string,
			unknown
		>
	} catch {
		return null
	}
}

function isValidRole(value: unknown): value is "MEMBER" | "ADMIN" {
	return value === "MEMBER" || value === "ADMIN"
}

interface NormalizedClaims {
	sub: string
	role: "MEMBER" | "ADMIN"
	exp: number
}

function asObject(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: null
}

function pickId(
	flatSub: unknown,
	nestedSub: Record<string, unknown> | null,
): string | null {
	if (typeof flatSub === "string") return flatSub
	if (typeof nestedSub?.id === "string") return nestedSub.id
	return null
}

function pickRole(
	rootRole: unknown,
	nestedSub: Record<string, unknown> | null,
): "MEMBER" | "ADMIN" | null {
	if (isValidRole(rootRole)) return rootRole
	if (isValidRole(nestedSub?.role)) return nestedSub.role
	return null
}

/**
 * Normalize the JWT payload into the shape consumed by the auth-store. The
 * backend currently nests the user identity inside `sub` (`{ id, email, role }`),
 * but older specs and tests use a flat shape (`sub: <id>, role: <role>`). We
 * accept both to keep the client compatible.
 */
function normalizeClaims(
	value: Record<string, unknown>,
): NormalizedClaims | null {
	if (typeof value.exp !== "number") return null
	const nestedSub = asObject(value.sub)
	const id = pickId(value.sub, nestedSub) ?? pickFlatId(value)
	const role = pickRole(value.role, nestedSub)
	if (!id || !role) return null
	return { sub: id, role, exp: value.exp }
}

function pickFlatId(value: Record<string, unknown>): string | null {
	if (typeof value.id === "string") return value.id
	return null
}

export function decodeJwt(token: string): JwtPayload | null {
	if (typeof token !== "string" || token.length === 0) return null
	const parts = token.split(".")
	if (parts.length !== 3) return null
	const payload = parsePayload(parts[1])
	if (!payload) return null
	return normalizeClaims(payload)
}
