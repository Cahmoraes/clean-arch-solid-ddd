"use client"

import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { getSemanaDoMes } from "@/features/calendario-feriados/lib/get-semana-do-mes"
import type { TrainingNoteDTO } from "../api/use-training-notes"

export interface TrainingNotesListProps {
	notas: TrainingNoteDTO[]
	monthIndex: number
	year: number
	isPending?: boolean
	isError?: boolean
	onRetry?: () => void
	onSelectDay?: (date: string) => void
}

const MESES_LOWER = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
] as const

function formatarDataLonga(date: string): string {
	const dia = Number(date.slice(8, 10))
	const mes = MESES_LOWER[Number(date.slice(5, 7)) - 1] ?? ""
	return `${dia} de ${mes}`
}

function agruparNotasPorSemana(
	notas: TrainingNoteDTO[],
): Array<{ semana: number; notas: TrainingNoteDTO[] }> {
	const grupos = new Map<number, TrainingNoteDTO[]>()
	const ordenadas = [...notas].sort((a, b) => (a.data < b.data ? -1 : 1))
	for (const nota of ordenadas) {
		const semana = getSemanaDoMes(nota.data)
		const grupo = grupos.get(semana) ?? []
		grupo.push(nota)
		grupos.set(semana, grupo)
	}
	return Array.from(grupos.entries())
		.sort(([a], [b]) => a - b)
		.map(([semana, notasDaSemana]) => ({ semana, notas: notasDaSemana }))
}

function ConteudoNotas({
	notas,
	isPending,
	isError,
	onRetry,
	onSelectDay,
}: {
	notas: TrainingNoteDTO[]
	isPending: boolean
	isError: boolean
	onRetry?: () => void
	onSelectDay?: (date: string) => void
}) {
	if (isPending && notas.length === 0) {
		return <p role="status">Carregando notas</p>
	}
	if (isError) {
		return (
			<div role="alert" className="flex flex-col gap-2">
				<p>Não foi possível carregar as notas</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					aria-label="Tentar de novo (notas)"
					onClick={onRetry}
				>
					Tentar de novo
				</Button>
			</div>
		)
	}
	if (notas.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">Nenhuma nota neste mês.</p>
		)
	}
	return (
		<div className="flex flex-col gap-4">
			{agruparNotasPorSemana(notas).map(({ semana, notas: grupo }) => (
				<fieldset key={semana} className="m-0 min-w-0 border-0 p-0">
					<legend className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
						Semana {semana}
					</legend>
					<ol className="flex flex-col gap-3">
						{grupo.map((nota) => (
							<li key={nota.data}>
								<button
									type="button"
									onClick={() => onSelectDay?.(nota.data)}
									aria-label={`Editar nota de ${formatarDataLonga(nota.data)}`}
									className="flex w-full cursor-pointer items-center gap-3 rounded-md bg-muted p-3 text-left focus-ring-duplo"
								>
									<time
										dateTime={nota.data}
										className="rounded-md bg-card px-2 py-1 font-display text-[15px]"
									>
										{formatarDataLonga(nota.data)}
									</time>
									<span className="line-clamp-2 text-sm text-foreground">
										{nota.texto}
									</span>
								</button>
							</li>
						))}
					</ol>
				</fieldset>
			))}
		</div>
	)
}

export function TrainingNotesList({
	notas,
	isPending = false,
	isError = false,
	onRetry,
	onSelectDay,
}: TrainingNotesListProps) {
	return (
		<Card className="rounded-xl">
			<CardHeader>
				<CardTitle as="h2">Minhas notas</CardTitle>
				<CardDescription>
					{notas.length === 1
						? "1 dia com nota no mês"
						: `${notas.length} dias com nota no mês`}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<section aria-label="Minhas notas do mês" aria-live="polite">
					<ConteudoNotas
						notas={notas}
						isPending={isPending}
						isError={isError}
						onRetry={onRetry}
						onSelectDay={onSelectDay}
					/>
				</section>
			</CardContent>
		</Card>
	)
}
