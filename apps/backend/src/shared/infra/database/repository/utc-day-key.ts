// The check-in day is the UTC calendar day (YYYY-MM-DD) of created_at (see the design spec).
export function utcDayKey(date: Date): string {
	return date.toISOString().slice(0, 10)
}
