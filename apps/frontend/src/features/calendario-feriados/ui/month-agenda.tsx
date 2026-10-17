"use client"

import { useId } from "react"
import { Button } from "@/components/ui/button"
import type { Feriado } from "@/features/calendario-feriados/model/feriado"
import {
	ARIA_TENTAR_DE_NOVO_FERIADOS,
	ARIA_TENTAR_DE_NOVO_NOTAS,
	type FonteStatus,
	MSG_CARREGANDO_FERIADOS,
	MSG_CARREGANDO_NOTAS,
	MSG_ERRO_FERIADOS,
	MSG_ERRO_NOTAS,
	TEXTO_TENTAR_DE_NOVO,
} from "@/features/calendario-feriados/model/fonte-status"
import type { TrainingNoteDTO } from "@/features/training-notes/api/use-training-notes"
import {
	diaDaSemana,
	formatarDataCurta,
} from "@/features/training-notes/lib/note-messages"
import { cn } from "@/lib/cn"

export interface MonthAgendaProps {
	feriados: Feriado[]
	notas: TrainingNoteDTO[]
	selectedDate: string
	onSelectDay: (date: string) => void
	notasStatus: FonteStatus
	feriadosStatus: FonteStatus
	onRetryNotas: () => void
	onRetryFeriados: () => void
}

type Entrada =
	| { tipo: "feriado"; data: string; feriado: Feriado }
	| { tipo: "nota"; data: string; nota: TrainingNoteDTO }

const PRIORIDADE_DO_TIPO = { feriado: 0, nota: 1 } as const

function compararEntradas(a: Entrada, b: Entrada): number {
	if (a.data !== b.data) return a.data < b.data ? -1 : 1
	return PRIORIDADE_DO_TIPO[a.tipo] - PRIORIDADE_DO_TIPO[b.tipo]
}

function mesclarEntradas(
	feriados: Feriado[],
	notas: TrainingNoteDTO[],
): Entrada[] {
	const doFeriado = (feriado: Feriado): Entrada => ({
		tipo: "feriado",
		data: feriado.date,
		feriado,
	})
	const daNota = (nota: TrainingNoteDTO): Entrada => ({
		tipo: "nota",
		data: nota.data,
		nota,
	})
	return [...feriados.map(doFeriado), ...notas.map(daNota)].sort(
		compararEntradas,
	)
}

function contar(n: number, singular: string, plural: string): string {
	return `${n} ${n === 1 ? singular : plural}`
}

function montarRotulo(props: MonthAgendaProps): string | null {
	const segmentos: string[] = []
	if (props.feriadosStatus === "ok") {
		segmentos.push(contar(props.feriados.length, "feriado", "feriados"))
	}
	if (props.notasStatus === "ok") {
		segmentos.push(contar(props.notas.length, "nota", "notas"))
	}
	if (segmentos.length === 0) return null
	return ["No mês", ...segmentos].join(" · ")
}

function formatarChipDeData(date: string): string {
	return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}

function ConteudoDaLinha({
	entrada,
	descricaoId,
}: {
	entrada: Entrada
	descricaoId: string
}) {
	if (entrada.tipo === "feriado") {
		return (
			<span className="flex min-w-0 flex-col">
				<strong id={descricaoId} className="truncate text-sm text-foreground">
					{entrada.feriado.name}
				</strong>
				<span className="truncate text-xs text-muted-foreground">
					nacional · {diaDaSemana(entrada.data)}
				</span>
			</span>
		)
	}
	return (
		<span id={descricaoId} className="truncate text-sm text-foreground">
			{entrada.nota.texto}
		</span>
	)
}

function LinhaDoMes({
	entrada,
	selecionada,
	onSelectDay,
}: {
	entrada: Entrada
	selecionada: boolean
	onSelectDay: (date: string) => void
}) {
	const descricaoId = useId()
	const rotuloDoTipo = entrada.tipo === "feriado" ? "feriado" : "nota"
	return (
		<li>
			<button
				type="button"
				onClick={() => onSelectDay(entrada.data)}
				aria-label={`Selecionar ${formatarDataCurta(entrada.data)} (${rotuloDoTipo})`}
				aria-describedby={descricaoId}
				aria-current={selecionada ? "true" : undefined}
				className={cn(
					"flex w-full cursor-pointer items-center gap-3 rounded-md border-l-[3px] bg-muted p-2 text-left focus-ring-duplo",
					entrada.tipo === "feriado" ? "border-warning" : "border-accent",
					selecionada && "bg-card",
				)}
			>
				<span className="shrink-0 rounded-md bg-card px-2 py-1 font-display text-[15px]">
					{formatarChipDeData(entrada.data)}
				</span>
				<ConteudoDaLinha entrada={entrada} descricaoId={descricaoId} />
			</button>
		</li>
	)
}

function chaveDaEntrada(entrada: Entrada): string {
	if (entrada.tipo === "feriado") {
		return `${entrada.data}-feriado-${entrada.feriado.name}`
	}
	return `${entrada.data}-nota`
}

function ListaDoMes({
	entradas,
	selectedDate,
	onSelectDay,
}: {
	entradas: Entrada[]
	selectedDate: string
	onSelectDay: (date: string) => void
}) {
	return (
		<div className="relative flex min-h-0 flex-1 flex-col">
			<div
				data-testid="month-agenda-lista"
				className="min-h-0 flex-1 overflow-y-auto max-h-80 xl:max-h-none"
			>
				<ul className="flex flex-col gap-2 pb-6">
					{entradas.map((entrada) => (
						<LinhaDoMes
							key={chaveDaEntrada(entrada)}
							entrada={entrada}
							selecionada={entrada.data === selectedDate}
							onSelectDay={onSelectDay}
						/>
					))}
				</ul>
			</div>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-card to-transparent"
			/>
		</div>
	)
}

function EstadoDaFonte({
	status,
	mensagemCarregando,
	mensagemErro,
	ariaTentarDeNovo,
	onRetry,
}: {
	status: FonteStatus
	mensagemCarregando: string
	mensagemErro: string
	ariaTentarDeNovo: string
	onRetry: () => void
}) {
	if (status === "carregando") {
		return <p role="status">{mensagemCarregando}</p>
	}
	if (status === "erro") {
		return (
			<div role="alert" className="flex flex-col items-start gap-2">
				<p>{mensagemErro}</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					aria-label={ariaTentarDeNovo}
					onClick={onRetry}
				>
					{TEXTO_TENTAR_DE_NOVO}
				</Button>
			</div>
		)
	}
	return null
}

export function MonthAgenda(props: MonthAgendaProps) {
	const entradas = mesclarEntradas(props.feriados, props.notas)
	const rotulo = montarRotulo(props)
	const fontesProntas =
		props.notasStatus === "ok" && props.feriadosStatus === "ok"
	return (
		<section
			aria-label="Lista do mês"
			className="flex min-h-0 flex-1 flex-col gap-2"
		>
			{rotulo ? (
				<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
					{rotulo}
				</p>
			) : null}
			<EstadoDaFonte
				status={props.feriadosStatus}
				mensagemCarregando={MSG_CARREGANDO_FERIADOS}
				mensagemErro={MSG_ERRO_FERIADOS}
				ariaTentarDeNovo={ARIA_TENTAR_DE_NOVO_FERIADOS}
				onRetry={props.onRetryFeriados}
			/>
			<EstadoDaFonte
				status={props.notasStatus}
				mensagemCarregando={MSG_CARREGANDO_NOTAS}
				mensagemErro={MSG_ERRO_NOTAS}
				ariaTentarDeNovo={ARIA_TENTAR_DE_NOVO_NOTAS}
				onRetry={props.onRetryNotas}
			/>
			{entradas.length > 0 ? (
				<ListaDoMes
					entradas={entradas}
					selectedDate={props.selectedDate}
					onSelectDay={props.onSelectDay}
				/>
			) : null}
			{fontesProntas && entradas.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Nenhuma nota ou feriado neste mês.
				</p>
			) : null}
		</section>
	)
}
