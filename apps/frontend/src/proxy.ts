import { type NextRequest, NextResponse } from "next/server"

const REFRESH_COOKIE_NAMES = ["refreshToken", "refresh_token"]
const SESSION_FLAG_COOKIE = "has_session"

export function proxy(request: NextRequest): NextResponse {
	const hasRefresh = REFRESH_COOKIE_NAMES.some(
		(name) => request.cookies.get(name)?.value,
	)
	// has_session é escrito pelo client-side em localhost:3000, portanto está
	// sempre presente nas requisições ao Next.js. Serve como fallback para o
	// caso em que o cookie httpOnly do backend (localhost:3333) não é enviado
	// cross-port pelo browser. O backend continua sendo a barreira de auth real.
	const hasSessionFlag = request.cookies.get(SESSION_FLAG_COOKIE)?.value === "1"

	if (!hasRefresh && !hasSessionFlag) {
		const url = request.nextUrl.clone()
		url.pathname = "/login"
		url.searchParams.set("redirect", request.nextUrl.pathname)
		return NextResponse.redirect(url)
	}
	return NextResponse.next()
}

export const config = {
	matcher: [
		"/perfil/:path*",
		"/academias/:path*",
		"/check-ins/:path*",
		"/assinatura/:path*",
		"/admin/:path*",
	],
}
