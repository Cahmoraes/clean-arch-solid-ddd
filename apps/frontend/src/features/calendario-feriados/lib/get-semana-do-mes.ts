import type { Feriado } from "@/features/calendario-feriados/model/feriado"

export function getSemanaDoMes(date: string): number {
	const day = Number(date.slice(8, 10))
	const firstOfMonth = new Date(`${date.slice(0, 7)}-01T12:00:00`)
	const firstWeekday = firstOfMonth.getDay()
	return Math.ceil((day + firstWeekday) / 7)
}

export function agruparFeriadosPorSemana(
	feriados: ReadonlyArray<Feriado>,
): Array<{ semana: number; feriados: Feriado[] }> {
	const grupos = new Map<number, Feriado[]>()
	for (const feriado of feriados) {
		const semana = getSemanaDoMes(feriado.date)
		const grupo = grupos.get(semana) ?? []
		grupo.push(feriado)
		grupos.set(semana, grupo)
	}
	return Array.from(grupos.entries())
		.sort(([a], [b]) => a - b)
		.map(([semana, feriadosDaSemana]) => ({
			semana,
			feriados: feriadosDaSemana,
		}))
}
