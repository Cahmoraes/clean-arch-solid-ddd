import { type NextRequest, NextResponse } from "next/server"

const REFRESH_COOKIE_NAMES = ["refreshToken", "refresh_token"]

export function middleware(request: NextRequest): NextResponse {
	const hasRefresh = REFRESH_COOKIE_NAMES.some(
		(name) => request.cookies.get(name)?.value,
	)
	if (!hasRefresh) {
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
