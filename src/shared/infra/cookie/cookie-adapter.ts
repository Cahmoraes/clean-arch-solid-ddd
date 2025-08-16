import { serialize } from 'cookie'
import { injectable } from 'inversify'
import setCookieParser from 'set-cookie-parser'

import type { Cookie, CookieManager } from './cookie-manager'

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
    return setCookieParser(cookie, {
      map: true,
    })
  }
}
