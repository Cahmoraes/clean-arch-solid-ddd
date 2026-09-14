import type { Feriado } from "@/features/calendario-feriados/model/feriado"

export function getFeriadosDoMes(
	feriados: ReadonlyArray<Feriado>,
	monthIndex: number,
): Feriado[] {
	return feriados.filter((f) => Number(f.date.slice(5, 7)) - 1 === monthIndex)
}
