export interface Logger {
	error(instance: object, message: string | object): void
	warn(instance: object, message: string | object): void
	info(instance: object, message: string | object): void
}
