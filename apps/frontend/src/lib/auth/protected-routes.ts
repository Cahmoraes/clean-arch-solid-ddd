export const PROTECTED_ROUTE_PREFIXES = [
	"/inicio",
	"/perfil",
	"/academias",
	"/calendario",
	"/check-ins",
	"/assinatura",
	"/admin",
] as const

export function isProtectedPathname(pathname: string | null): boolean {
	if (!pathname) return false
	return PROTECTED_ROUTE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	)
}
