export const SIDEBAR_COLLAPSE_COOKIE = "sidebar_collapsed"

/**
 * Grava a preferência de recolhimento da sidebar num cookie de 1 ano.
 * Client-side only — no-op durante SSR (sem `document`).
 */
export function writeSidebarCollapseCookie(collapsed: boolean): void {
	if (typeof document === "undefined") return
	// biome-ignore lint/suspicious/noDocumentCookie: cookieStore não está disponível no Firefox e Safari <17; document.cookie é o fallback compatível
	document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`
}

/** Interpreta o valor bruto do cookie. Ausente/inválido => expandido (false). */
export function parseSidebarCollapseCookie(value: string | undefined): boolean {
	return value === "1"
}
