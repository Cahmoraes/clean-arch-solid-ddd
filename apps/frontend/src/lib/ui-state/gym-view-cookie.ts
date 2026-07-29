export type GymView = "cards" | "rows"

export const GYM_VIEW_COOKIE = "gym_view"

/**
 * Grava a preferência de visualização de academias num cookie de 1 ano.
 * Client-side only — no-op durante SSR (sem `document`).
 */
export function writeGymViewCookie(view: GymView): void {
	if (typeof document === "undefined") return
	// biome-ignore lint/suspicious/noDocumentCookie: cookieStore não está disponível no Firefox e Safari <17; document.cookie é o fallback compatível
	document.cookie = `${GYM_VIEW_COOKIE}=${view}; path=/; max-age=31536000; SameSite=Lax`
}

/** Interpreta o valor bruto do cookie. Ausente/inválido => cards. */
export function parseGymViewCookie(value: string | undefined): GymView {
	return value === "rows" ? "rows" : "cards"
}
