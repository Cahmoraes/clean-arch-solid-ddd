function isSameCalendarDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}

export function formatActivityGroupLabel(occurredAtISO: string): string {
	const date = new Date(occurredAtISO)
	const now = new Date()

	if (isSameCalendarDay(date, now)) return "Hoje"

	const yesterday = new Date(now)
	yesterday.setDate(yesterday.getDate() - 1)
	if (isSameCalendarDay(date, yesterday)) return "Ontem"

	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	}).format(date)
}

export function formatActivityTime(occurredAtISO: string): string {
	try {
		return new Intl.DateTimeFormat("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(occurredAtISO))
	} catch {
		return occurredAtISO
	}
}
