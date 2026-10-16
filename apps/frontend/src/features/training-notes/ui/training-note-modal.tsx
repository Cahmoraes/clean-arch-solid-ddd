"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { type UseFormRegister, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/errors"
import {
	NOTA_JA_EXISTE_CODE,
	type UpsertNoteInput,
	useCreateNote,
	useDeleteNote,
	useUpdateNote,
} from "../api/use-training-notes"

export interface TrainingNoteModalProps {
	open: boolean
	date: string | null
	initialTexto?: string
	onOpenChange: (open: boolean) => void
}

const ERRO_TEXTO_INVALIDO = "Escreva de 1 a 500 caracteres"
const AVISO_CONFLITO = "Esse dia já tem nota — edite a atual"
const ERRO_REDE = "Sem conexão — tente de novo"
const ERRO_NAO_ENCONTRADA = "Nota não encontrada — recarregue o mês"

const notaSchema = z.object({
	texto: z
		.string()
		.trim()
		.min(1, ERRO_TEXTO_INVALIDO)
		.max(500, ERRO_TEXTO_INVALIDO),
})

type NotaForm = z.infer<typeof notaSchema>

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

function formatarDataCurta(date: string): string {
	const dia = Number(date.slice(8, 10))
	const mes = MESES_LOWER[Number(date.slice(5, 7)) - 1] ?? ""
	return `${dia} de ${mes}`
}

function isNotaJaExiste(error: unknown): boolean {
	return (
		error instanceof ApiError &&
		(error.status === 409 || error.code === NOTA_JA_EXISTE_CODE)
	)
}

function isNotaInexistente(error: unknown): boolean {
	return error instanceof ApiError && error.status === 404
}

function mensagemDeFalha(error: unknown): string {
	if (isNotaInexistente(error)) return ERRO_NAO_ENCONTRADA
	return ERRO_REDE
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
}: {
	register: UseFormRegister<NotaForm>
	erroValidacao: string | undefined
	erroSalvar: string | null
	disabled: boolean
}) {
	const erroFormulario = erroValidacao ?? erroSalvar
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor="nota-treino-texto">Nota do treino</Label>
			<textarea
				id="nota-treino-texto"
				rows={4}
				maxLength={500}
				disabled={disabled}
				className="min-h-24 w-full rounded-md border border-subtle bg-background px-4 py-2 font-mono text-base text-foreground placeholder:text-muted-foreground focus-ring-duplo disabled:cursor-not-allowed disabled:opacity-50"
				{...propsDeErro(erroValidacao)}
				{...register("texto")}
			/>
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

function ouPendente(a: boolean, b: boolean): boolean {
	return a || b
}

const DESCRICAO_POR_MODO = {
	criar: "Descreva o treino do dia em até 500 caracteres.",
	editar: "Edite o texto da nota ou exclua o treino do dia.",
} as const

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

function AcoesModal({
	modo,
	salvando,
	excluindo,
	comErroSalvar,
	onCancelar,
	onRepetir,
	onExcluir,
}: {
	modo: "criar" | "editar"
	salvando: boolean
	excluindo: boolean
	comErroSalvar: boolean
	onCancelar: () => void
	onRepetir: () => void
	onExcluir: () => void
}) {
	return (
		<DialogFooter className="flex-row flex-wrap justify-start gap-2">
			<Button type="submit" disabled={salvando}>
				Salvar
			</Button>
			<Button
				type="button"
				variant="outline"
				disabled={salvando}
				onClick={onCancelar}
			>
				Cancelar
			</Button>
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
				<Button
					type="button"
					variant="destructive"
					disabled={salvando || excluindo}
					onClick={onExcluir}
				>
					Excluir
				</Button>
			) : null}
		</DialogFooter>
	)
}

function ConfirmacaoExclusao({
	date,
	open,
	onOpenChange,
	onConfirmar,
}: {
	date: string
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirmar: () => void
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Excluir a nota?</AlertDialogTitle>
					<AlertDialogDescription>
						A nota de {formatarDataCurta(date)} será apagada e sairá da célula e
						da lista. Essa ação não pode ser desfeita.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={(event) => {
							event.preventDefault()
							onConfirmar()
						}}
					>
						Confirmar
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

function ModalBody({
	date,
	initialTexto,
	onOpenChange,
}: {
	date: string
	initialTexto?: string
	onOpenChange: (open: boolean) => void
}) {
	const textoInicial = initialTexto ?? ""
	const [modo, setModo] = useState<"criar" | "editar">(
		inferirModo(textoInicial),
	)
	const [avisoConflito, setAvisoConflito] = useState(false)
	const [erroSalvar, setErroSalvar] = useState<string | null>(null)
	const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
	const form = useForm<NotaForm>({
		resolver: zodResolver(notaSchema),
		defaultValues: { texto: textoInicial },
	})
	const createNote = useCreateNote()
	const updateNote = useUpdateNote()
	const deleteNote = useDeleteNote()
	const salvando = ouPendente(createNote.isPending, updateNote.isPending)
	const erroValidacao = form.formState.errors.texto?.message

	async function salvar(valores: NotaForm): Promise<void> {
		setErroSalvar(null)
		const texto = valores.texto.trim()
		try {
			const resultado = await persistirNota(
				modo,
				date,
				texto,
				createNote,
				updateNote,
			)
			toast.success(resultado === "criada" ? "Nota salva." : "Nota atualizada.")
			onOpenChange(false)
		} catch (error) {
			tratarErroSalvar(error, setModo, setAvisoConflito, setErroSalvar)
		}
	}

	async function excluir(): Promise<void> {
		try {
			await deleteNote.mutateAsync({ data: date })
			toast.success("Nota excluída.")
			setConfirmandoExclusao(false)
			onOpenChange(false)
		} catch {
			toast.error("Não foi possível excluir. Tente de novo.")
		}
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>{formatarDataCurta(date)} — minha nota</DialogTitle>
				<DialogDescription>{DESCRICAO_POR_MODO[modo]}</DialogDescription>
			</DialogHeader>
			{avisoConflito ? <p role="status">{AVISO_CONFLITO}</p> : null}
			<form
				className="flex flex-col gap-4"
				onSubmit={(event) => {
					void form.handleSubmit(salvar)(event)
				}}
			>
				<CampoTextoNota
					register={form.register}
					erroValidacao={erroValidacao}
					erroSalvar={erroSalvar}
					disabled={salvando}
				/>
				<AcoesModal
					modo={modo}
					salvando={salvando}
					excluindo={deleteNote.isPending}
					comErroSalvar={erroSalvar !== null}
					onCancelar={() => onOpenChange(false)}
					onRepetir={() => {
						void form.handleSubmit(salvar)()
					}}
					onExcluir={() => setConfirmandoExclusao(true)}
				/>
			</form>
			<ConfirmacaoExclusao
				date={date}
				open={confirmandoExclusao}
				onOpenChange={setConfirmandoExclusao}
				onConfirmar={() => {
					void excluir()
				}}
			/>
		</>
	)
}

export function TrainingNoteModal({
	open,
	date,
	initialTexto,
	onOpenChange,
}: TrainingNoteModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{date ? (
				<DialogContent>
					<ModalBody
						key={date}
						date={date}
						initialTexto={initialTexto}
						onOpenChange={onOpenChange}
					/>
				</DialogContent>
			) : null}
		</Dialog>
	)
}
