export function isValidDate(aString: string) {
	return !isNaN(new Date(aString).getTime())
}
