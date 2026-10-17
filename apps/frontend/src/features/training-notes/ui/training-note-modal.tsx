"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { type UseFormRegister, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button, type ButtonProps } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { type PixelIcon, Save, Trash2, X } from "@/components/ui/pixel-icons"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { ApiError } from "@/lib/errors"
import {
	NOTA_JA_EXISTE_CODE,
	type UpsertNoteInput,
	useCreateNote,
	useUpdateNote,
} from "../api/use-training-notes"
import {
	AVISO_CONFLITO,
	diaDaSemana,
	ERRO_TEXTO_INVALIDO,
	formatarDataCurta,
	mensagemDeFalha,
} from "../lib/note-messages"

export interface NoteModalProps {
	open: boolean
	date: string | null
	feriadoNome?: string
	initialTexto?: string
	onOpenChange: (open: boolean) => void
	onRequestDelete: (date: string) => void
	onCloseAutoFocus: (event: Event) => void
}

const LIMITE_TEXTO = 500
const ID_CAMPO_TEXTO = "nota-treino-texto"

const notaSchema = z.object({
	texto: z
		.string()
		.trim()
		.min(1, ERRO_TEXTO_INVALIDO)
		.max(LIMITE_TEXTO, ERRO_TEXTO_INVALIDO),
})

type NotaForm = z.infer<typeof notaSchema>

function isNotaJaExiste(error: unknown): boolean {
	return (
		error instanceof ApiError &&
		(error.status === 409 || error.code === NOTA_JA_EXISTE_CODE)
	)
}

function tratarErroSalvar(
	error: unknown,
	setModo: (modo: "criar" | "editar") => void,
	setAvisoConflito: (aberto: boolean) => void,
	setErroSalvar: (mensagem: string | null) => void,
): void {
	if (isNotaJaExiste(error)) {
		setModo("editar")
		setAvisoConflito(true)
		return
	}
	const mensagem = mensagemDeFalha(error)
	setErroSalvar(mensagem)
	toast.error(mensagem)
}

function propsDeErro(erroValidacao: string | undefined): {
	"aria-invalid"?: true
	"aria-describedby"?: string
} {
	if (!erroValidacao) return {}
	return { "aria-invalid": true, "aria-describedby": "nota-treino-erro" }
}

function CampoTextoNota({
	register,
	erroValidacao,
	erroSalvar,
	disabled,
	tamanho,
}: {
	register: UseFormRegister<NotaForm>
	erroValidacao: string | undefined
	erroSalvar: string | null
	disabled: boolean
	tamanho: number
}) {
	const erroFormulario = erroValidacao ?? erroSalvar
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={ID_CAMPO_TEXTO}>Nota do treino</Label>
			<textarea
				id={ID_CAMPO_TEXTO}
				rows={6}
				maxLength={LIMITE_TEXTO}
				disabled={disabled}
				className="min-h-32 w-full rounded-md border border-subtle bg-background px-4 py-2 font-mono text-base text-foreground placeholder:text-muted-foreground focus-ring-duplo disabled:cursor-not-allowed disabled:opacity-50"
				{...propsDeErro(erroValidacao)}
				{...register("texto")}
			/>
			<span className="self-end font-mono text-sm text-muted-foreground">
				{tamanho}/{LIMITE_TEXTO}
			</span>
			{erroFormulario ? (
				<p
					id={erroValidacao ? "nota-treino-erro" : undefined}
					role="alert"
					className="text-sm"
				>
					{erroFormulario}
				</p>
			) : null}
		</div>
	)
}

function inferirModo(textoInicial: string): "criar" | "editar" {
	return textoInicial ? "editar" : "criar"
}

interface GravadorNota {
	mutateAsync: (input: UpsertNoteInput) => Promise<unknown>
}

async function persistirNota(
	modo: "criar" | "editar",
	date: string,
	texto: string,
	criacao: GravadorNota,
	edicao: GravadorNota,
): Promise<"criada" | "atualizada"> {
	if (modo === "criar") {
		await criacao.mutateAsync({ data: date, texto })
		return "criada"
	}
	await edicao.mutateAsync({ data: date, texto })
	return "atualizada"
}

interface BotaoDeAcaoProps
	extends Omit<ButtonProps, "size" | "children" | "aria-label"> {
	rotulo: string
	icone: PixelIcon
}

function BotaoDeAcao({ rotulo, icone: Icone, ...props }: BotaoDeAcaoProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button size="icon" aria-label={rotulo} {...props}>
					<Icone className="h-4 w-4" aria-hidden="true" />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{rotulo}</TooltipContent>
		</Tooltip>
	)
}

function AcoesModal({
	modo,
	salvando,
	comErroSalvar,
	onCancelar,
	onRepetir,
	onExcluir,
}: {
	modo: "criar" | "editar"
	salvando: boolean
	comErroSalvar: boolean
	onCancelar: () => void
	onRepetir: () => void
	onExcluir: () => void
}) {
	return (
		<div className="flex gap-2">
			<BotaoDeAcao
				rotulo="Salvar"
				icone={Save}
				type="submit"
				variant="primary"
				disabled={salvando}
			/>
			<BotaoDeAcao
				rotulo="Cancelar"
				icone={X}
				variant="outline"
				disabled={salvando}
				onClick={onCancelar}
			/>
			{comErroSalvar ? (
				<Button
					type="button"
					variant="outline"
					disabled={salvando}
					onClick={onRepetir}
				>
					Repetir
				</Button>
			) : null}
			{modo === "editar" ? (
				<BotaoDeAcao
					rotulo="Excluir"
					icone={Trash2}
					variant="destructive"
					disabled={salvando}
					onClick={onExcluir}
				/>
			) : null}
		</div>
	)
}

function CorpoModal({
	date,
	initialTexto,
	onOpenChange,
	onRequestDelete,
}: {
	date: string
	initialTexto?: string
	onOpenChange: (open: boolean) => void
	onRequestDelete: (date: string) => void
}) {
	const textoInicial = initialTexto ?? ""
	const [modo, setModo] = useState<"criar" | "editar">(
		inferirModo(textoInicial),
	)
	const [avisoConflito, setAvisoConflito] = useState(false)
	const [erroSalvar, setErroSalvar] = useState<string | null>(null)
	const form = useForm<NotaForm>({
		resolver: zodResolver(notaSchema),
		defaultValues: { texto: textoInicial },
	})
	const createNote = useCreateNote()
	const updateNote = useUpdateNote()
	const salvando = createNote.isPending || updateNote.isPending

	async function salvar(valores: NotaForm): Promise<void> {
		setErroSalvar(null)
		try {
			const resultado = await persistirNota(
				modo,
				date,
				valores.texto,
				createNote,
				updateNote,
			)
			toast.success(resultado === "criada" ? "Nota salva." : "Nota atualizada.")
			onOpenChange(false)
		} catch (error) {
			tratarErroSalvar(error, setModo, setAvisoConflito, setErroSalvar)
		}
	}

	return (
		<>
			{avisoConflito ? <p role="status">{AVISO_CONFLITO}</p> : null}
			<form
				noValidate
				className="flex flex-col gap-4"
				onSubmit={(event) => {
					void form.handleSubmit(salvar)(event)
				}}
			>
				<CampoTextoNota
					register={form.register}
					erroValidacao={form.formState.errors.texto?.message}
					erroSalvar={erroSalvar}
					disabled={salvando}
					tamanho={form.watch("texto").length}
				/>
				<AcoesModal
					modo={modo}
					salvando={salvando}
					comErroSalvar={erroSalvar !== null}
					onCancelar={() => onOpenChange(false)}
					onRepetir={() => {
						void form.handleSubmit(salvar)()
					}}
					onExcluir={() => onRequestDelete(date)}
				/>
			</form>
		</>
	)
}

function subtitulo(date: string, feriadoNome: string | undefined): string {
	const diaSemana = diaDaSemana(date)
	return feriadoNome ? `${diaSemana} · ${feriadoNome}` : diaSemana
}

// Foco inicial no campo: nenhum botão (e nenhum tooltip) recebe o foco ao abrir.
function focarCampoTexto(event: Event): void {
	event.preventDefault()
	document.getElementById(ID_CAMPO_TEXTO)?.focus()
}

export function NoteModal({
	open,
	date,
	feriadoNome,
	initialTexto,
	onOpenChange,
	onRequestDelete,
	onCloseAutoFocus,
}: NoteModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{date ? (
				<DialogContent
					onOpenAutoFocus={focarCampoTexto}
					onCloseAutoFocus={onCloseAutoFocus}
				>
					<DialogHeader>
						<DialogTitle>{formatarDataCurta(date)}</DialogTitle>
						<DialogDescription>
							{subtitulo(date, feriadoNome)}
						</DialogDescription>
					</DialogHeader>
					<CorpoModal
						key={date}
						date={date}
						initialTexto={initialTexto}
						onOpenChange={onOpenChange}
						onRequestDelete={onRequestDelete}
					/>
				</DialogContent>
			) : null}
		</Dialog>
	)
}
