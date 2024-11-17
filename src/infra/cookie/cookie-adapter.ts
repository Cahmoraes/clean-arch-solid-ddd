import { serialize } from 'cookie'
import { injectable } from 'inversify'

import type { CookieManager } from './cookie-manager'

@injectable()
export class CookieAdapter implements CookieManager {
  serialize(
    name: string,
    value: string,
    options?: Record<string, unknown>,
  ): string {
    return serialize(name, value, options)
  }
}
