export function isValidDate(aString: string) {
	return !Number.isNaN(new Date(aString).getTime())
}
