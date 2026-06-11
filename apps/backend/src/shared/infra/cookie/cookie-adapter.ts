import { parse, serialize } from "cookie"
import { injectable } from "inversify"

import type { Cookie, CookieManager } from "./cookie-manager"

@injectable()
export class CookieAdapter implements CookieManager {
	public serialize(
		name: string,
		value: string,
		options?: Record<string, unknown>,
	): string {
		return serialize(name, value, options)
	}

	public parse(cookie?: string): Record<string, Cookie> {
		if (!cookie) return {}
		const parsed = parse(cookie)
		const result: Record<string, Cookie> = {}
		for (const [name, value] of Object.entries(parsed)) {
			if (value !== undefined) {
				result[name] = { name, value }
			}
		}
		return result
	}
}
