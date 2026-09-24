"use client"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { getMonthLabel } from "@/features/calendario-feriados/hooks/use-calendar-navigation"
import { agruparFeriadosPorSemana } from "@/features/calendario-feriados/lib/get-semana-do-mes"
import type { Feriado } from "@/features/calendario-feriados/model/feriado"

export interface HolidayListProps {
	feriados: Feriado[]
	monthIndex: number
	year: number
	total?: number
	/**
	 * Alias para compatibilidade: permite passar `feriadosDoMes` como prop alternativa.
	 * @deprecated usar `feriados`
	 */
	feriadosDoMes?: Feriado[]
}

const WEEKDAY_FULL = [
	"domingo",
	"segunda-feira",
	"terça-feira",
	"quarta-feira",
	"quinta-feira",
	"sexta-feira",
	"sábado",
] as const

function formatDateBR(date: string): string {
	const [year, month, day] = date.split("-")
	return `${day}/${month}/${year}`
}

function getWeekday(date: string): string {
	const d = new Date(`${date}T12:00:00`)
	const w = d.getDay()
	return WEEKDAY_FULL[w] ?? ""
}

export function HolidayList({
	feriados,
	feriadosDoMes,
	monthIndex,
	year,
	total,
}: HolidayListProps) {
	const list = feriados ?? feriadosDoMes ?? []
	const monthLabel = getMonthLabel(monthIndex, year).split(" ")[0] ?? ""
	const monthLabelLower = monthLabel.toLowerCase()
	const subtitle =
		total !== undefined
			? `${list.length} de ${total} em ${year}`
			: `${list.length} feriado(s) no mês`

	return (
		<Card className="rounded-xl">
			<CardHeader>
				<CardTitle as="h2">Feriados de {monthLabelLower}</CardTitle>
				<CardDescription>{subtitle}</CardDescription>
			</CardHeader>
			<CardContent>
				{list.length > 0 ? (
					<div className="flex flex-col gap-4">
						{agruparFeriadosPorSemana(list).map(
							({ semana, feriados: feriadosDaSemana }) => (
								<fieldset key={semana} className="m-0 min-w-0 border-0 p-0">
									<legend className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
										Semana {semana}
									</legend>
									<ol className="flex flex-col gap-3">
										{feriadosDaSemana.map((feriado) => (
											<li
												key={`${feriado.date}-${feriado.name}`}
												className="flex items-center gap-3 rounded-md bg-muted p-3"
											>
												<time
													dateTime={feriado.date}
													className="rounded-md bg-card px-2 py-1 font-mono text-xs font-medium"
												>
													{formatDateBR(feriado.date)}
												</time>
												<div className="flex flex-col">
													<strong className="text-sm text-foreground">
														{feriado.name}
													</strong>
													<span className="text-xs text-muted-foreground">
														nacional · {getWeekday(feriado.date)}
													</span>
												</div>
											</li>
										))}
									</ol>
								</fieldset>
							),
						)}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						Nenhum feriado neste mês.
					</p>
				)}
			</CardContent>
		</Card>
	)
}
