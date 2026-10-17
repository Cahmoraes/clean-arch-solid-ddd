"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { type UseFormRegister, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
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

export interface NoteDrawerProps {
	open: boolean
	date: string | null
	feriadoNome?: string
	initialTexto?: string
	onOpenChange: (open: boolean) => void
	onRequestDelete: (date: string) => void
	onCloseAutoFocus: (event: Event) => void
}

const LIMITE_TEXTO = 500

const notaSchema = z.object({
	texto: z
		.string()
		.trim()
		.min(1, ERRO_TEXTO_INVALIDO)
		.max(LIMITE_TEXTO, ERRO_TEXTO_INVALIDO),
})

type NotaForm = z.infer<typeof notaSchema>

// Pela base abaixo de 768px (md) e lateral direita a partir dele.
const CLASSES_LADO_RESPONSIVO =
	"max-h-[85dvh] overflow-y-auto md:inset-x-auto md:inset-y-0 md:right-0 md:h-full md:max-h-none md:w-3/4 md:max-w-sm md:border-t-0 md:border-l md:data-[state=closed]:slide-out-to-right md:data-[state=open]:slide-in-from-right"

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
			<Label htmlFor="nota-treino-texto">Nota do treino</Label>
			<textarea
				id="nota-treino-texto"
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

function AcoesGaveta({
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
		<SheetFooter className="flex-row flex-wrap justify-start gap-2 px-0">
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
					disabled={salvando}
					onClick={onExcluir}
				>
					Excluir
				</Button>
			) : null}
		</SheetFooter>
	)
}

function CorpoGaveta({
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
				<AcoesGaveta
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

export function NoteDrawer({
	open,
	date,
	feriadoNome,
	initialTexto,
	onOpenChange,
	onRequestDelete,
	onCloseAutoFocus,
}: NoteDrawerProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			{date ? (
				<SheetContent
					side="bottom"
					className={CLASSES_LADO_RESPONSIVO}
					onCloseAutoFocus={onCloseAutoFocus}
				>
					<SheetHeader>
						<SheetTitle>{formatarDataCurta(date)}</SheetTitle>
						<SheetDescription>{subtitulo(date, feriadoNome)}</SheetDescription>
					</SheetHeader>
					<CorpoGaveta
						key={date}
						date={date}
						initialTexto={initialTexto}
						onOpenChange={onOpenChange}
						onRequestDelete={onRequestDelete}
					/>
				</SheetContent>
			) : null}
		</Sheet>
	)
}
