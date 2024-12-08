export interface Logger {
  error(instance: object, message: string): void
  warn(instance: object, message: string): void
  info(instance: object, message: string): void
}
