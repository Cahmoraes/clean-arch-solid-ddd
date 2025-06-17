import { parse, serialize } from 'cookie'
import { injectable } from 'inversify'

import type { CookieManager } from './cookie-manager'

@injectable()
export class CookieAdapter implements CookieManager {
  public serialize(
    name: string,
    value: string,
    options?: Record<string, unknown>,
  ): string {
    return serialize(name, value, options)
  }

  public parse(cookie?: string): Record<string, string | undefined> {
    console.log({ cookie })
    if (!cookie) return {}
    return parse(cookie)
  }
}
