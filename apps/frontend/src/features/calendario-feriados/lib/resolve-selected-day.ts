type ResolveSelectedDayInput = {
	clicked: string | null
	year: number
	monthIndex: number
	today: Date
}

function prefixoDoMes(year: number, monthIndex: number): string {
	return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

function formatarDiaLocal(date: Date): string {
	const mes = String(date.getMonth() + 1).padStart(2, "0")
	const dia = String(date.getDate()).padStart(2, "0")
	return `${date.getFullYear()}-${mes}-${dia}`
}

export function resolveSelectedDay({
	clicked,
	year,
	monthIndex,
	today,
}: ResolveSelectedDayInput): string {
	const prefixo = prefixoDoMes(year, monthIndex)
	if (clicked !== null && clicked.slice(0, 7) === prefixo) return clicked

	const hoje = formatarDiaLocal(today)
	if (hoje.slice(0, 7) === prefixo) return hoje

	return `${prefixo}-01`
}
