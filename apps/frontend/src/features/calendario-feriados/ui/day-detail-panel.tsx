"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export interface DayDetailPanelProps {
	date: string
	feriado?: Feriado
	nota?: TrainingNoteDTO
	notasStatus: FonteStatus
	feriadosStatus: FonteStatus
	onOpenNote: () => void
	onRetryNotas: () => void
	onRetryFeriados: () => void
	children?: ReactNode
	className?: string
}

const ROTULO_CLASSE =
	"text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"

function ErroComRetry({
	mensagem,
	ariaLabel,
	onRetry,
}: {
	mensagem: string
	ariaLabel: string
	onRetry: () => void
}) {
	return (
		<div role="alert" className="flex flex-col items-start gap-2">
			<p className="text-sm">{mensagem}</p>
			<Button
				type="button"
				variant="outline"
				size="sm"
				aria-label={ariaLabel}
				onClick={onRetry}
			>
				{TEXTO_TENTAR_DE_NOVO}
			</Button>
		</div>
	)
}

function BlocoDeFeriado({
	status,
	feriado,
	onRetry,
}: {
	status: FonteStatus
	feriado?: Feriado
	onRetry: () => void
}) {
	if (status === "carregando") {
		return (
			<p role="status" className="text-sm text-muted-foreground">
				{MSG_CARREGANDO_FERIADOS}
			</p>
		)
	}
	if (status === "erro") {
		return (
			<ErroComRetry
				mensagem={MSG_ERRO_FERIADOS}
				ariaLabel={ARIA_TENTAR_DE_NOVO_FERIADOS}
				onRetry={onRetry}
			/>
		)
	}
	if (!feriado) return null
	return (
		<div className="flex flex-col gap-1 rounded-md border-l-[3px] border-warning bg-muted px-3 py-2">
			<small className={ROTULO_CLASSE}>Feriado nacional</small>
			<p className="text-sm font-bold">{feriado.name}</p>
		</div>
	)
}

function BlocoDeNotaComTexto({
	nota,
	onOpenNote,
}: {
	nota: TrainingNoteDTO
	onOpenNote: () => void
}) {
	return (
		<div className="flex flex-col gap-1 rounded-md border-l-[3px] border-accent bg-muted px-3 py-2">
			<small className={ROTULO_CLASSE}>Nota do dia</small>
			<button
				type="button"
				onClick={onOpenNote}
				className="w-full cursor-pointer text-left focus-ring-duplo"
			>
				<span className="line-clamp-3 whitespace-pre-line break-words text-sm">
					{nota.texto}
				</span>
				<span className="mt-1 block text-xs text-accent">
					Ver nota completa
				</span>
			</button>
		</div>
	)
}

function BlocoSemNota({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex flex-col items-start gap-2 rounded-md border-l-[3px] border-accent bg-muted px-3 py-2">
			<small className={ROTULO_CLASSE}>Nota do dia</small>
			<p className="text-sm text-muted-foreground">Nenhuma nota neste dia.</p>
			<Button type="button" size="sm" onClick={onAdd}>
				Adicionar nota
			</Button>
		</div>
	)
}

function BlocoDeNota({
	status,
	nota,
	onOpenNote,
	onRetry,
}: {
	status: FonteStatus
	nota?: TrainingNoteDTO
	onOpenNote: () => void
	onRetry: () => void
}) {
	if (status === "carregando") {
		return (
			<p role="status" className="text-sm text-muted-foreground">
				{MSG_CARREGANDO_NOTAS}
			</p>
		)
	}
	if (status === "erro") {
		return (
			<ErroComRetry
				mensagem={MSG_ERRO_NOTAS}
				ariaLabel={ARIA_TENTAR_DE_NOVO_NOTAS}
				onRetry={onRetry}
			/>
		)
	}
	if (!nota) return <BlocoSemNota onAdd={onOpenNote} />
	return <BlocoDeNotaComTexto nota={nota} onOpenNote={onOpenNote} />
}

export function DayDetailPanel(props: DayDetailPanelProps) {
	return (
		<Card
			role="complementary"
			aria-label="Resumo do mês"
			className={cn("min-h-0 gap-4 overflow-hidden", props.className)}
		>
			<CardHeader>
				<CardTitle as="h2">{formatarDataCurta(props.date)}</CardTitle>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">
						{diaDaSemana(props.date)}
					</span>
					<span className="rounded-md bg-accent/15 px-2 font-display text-[15px] text-accent">
						selecionado
					</span>
				</div>
			</CardHeader>
			<CardContent className="flex min-h-0 flex-1 flex-col gap-3">
				<BlocoDeFeriado
					status={props.feriadosStatus}
					feriado={props.feriado}
					onRetry={props.onRetryFeriados}
				/>
				<BlocoDeNota
					status={props.notasStatus}
					nota={props.nota}
					onOpenNote={props.onOpenNote}
					onRetry={props.onRetryNotas}
				/>
				<div className="flex min-h-0 flex-1 flex-col">{props.children}</div>
			</CardContent>
		</Card>
	)
}
