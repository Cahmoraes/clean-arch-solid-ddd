export interface Cookie {
	/**
	 * cookie name
	 */
	name: string
	/**
	 * cookie value
	 */
	value: string
	/**
	 * cookie path
	 */
	path?: string | undefined
	/**
	 * absolute expiration date for the cookie
	 */
	expires?: Date | undefined
	/**
	 * relative max age of the cookie in seconds from when the client receives it (integer or undefined)
	 * Note: when using with express's res.cookie() method, multiply maxAge by 1000 to convert to milliseconds
	 */
	maxAge?: number | undefined
	/**
	 * domain for the cookie,
	 * may begin with "." to indicate the named domain or any subdomain of it
	 */
	domain?: string | undefined
	/**
	 * indicates that this cookie should only be sent over HTTPs
	 */
	secure?: boolean | undefined
	/**
	 * indicates that this cookie should not be accessible to client-side JavaScript
	 */
	httpOnly?: boolean | undefined
	/**
	 * indicates a cookie ought not to be sent along with cross-site requests
	 */
	sameSite?: string | undefined
}

export interface CookieManager {
	serialize(
		name: string,
		value: string,
		options?: Record<string, unknown>,
	): string
	parse(cookie?: string): Record<string, Cookie>
}
