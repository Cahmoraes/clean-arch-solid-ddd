export interface CookieManager {
  serialize(
    name: string,
    value: string,
    options?: Record<string, unknown>,
  ): string
  parse(cookie?: string): Record<string, string | undefined>
}
