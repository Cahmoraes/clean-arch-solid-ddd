"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FieldShell } from "@/components/ui/field-shell"
import { FormField } from "@/components/ui/form-field"
import { useBroadcastNotice } from "@/features/notices/api/use-broadcast-notice"
import { NoticePreview } from "@/features/notices/components/notice-preview"
import {
	NOTICE_MESSAGE_MAX,
	type NoticeInput,
	noticeSchema,
} from "@/features/notices/schemas/notice-schema"
import { cn } from "@/lib/cn"
import { ApiError } from "@/lib/errors"

const EMPTY_NOTICE: NoticeInput = { title: "", message: "" }
const FALLBACK_ERROR_MESSAGE =
	"Não foi possível enviar o aviso. Tente novamente."

function successMessage(recipients: number): string {
	return recipients === 1
		? "Aviso enviado para 1 usuário."
		: `Aviso enviado para ${recipients} usuários.`
}

function errorMessage(error: unknown): string {
	return error instanceof ApiError ? error.userMessage : FALLBACK_ERROR_MESSAGE
}

export function NoticeForm() {
	const titleId = useId()
	const messageId = useId()
	const counterId = useId()
	const { mutateAsync, isPending } = useBroadcastNotice()
	const {
		register,
		handleSubmit,
		reset,
		control,
		formState: { errors },
	} = useForm<NoticeInput>({
		resolver: zodResolver(noticeSchema),
		defaultValues: EMPTY_NOTICE,
	})
	const [title, message] = useWatch({ control, name: ["title", "message"] })

	async function onSubmit(values: NoticeInput) {
		try {
			const { recipients } = await mutateAsync(values)
			toast.success(successMessage(recipients))
			reset(EMPTY_NOTICE)
		} catch (error) {
			toast.error(errorMessage(error))
		}
	}

	const messageDescribedBy = errors.message
		? `${messageId}-error ${counterId}`
		: counterId

	return (
		<div className="grid gap-4 min-[860px]:grid-cols-[1.2fr_1fr]">
			<Card>
				<CardContent>
					<form
						onSubmit={handleSubmit(onSubmit)}
						noValidate
						className="flex flex-col gap-4"
						aria-label="Formulário de novo aviso"
					>
						<FormField
							id={titleId}
							label="Título"
							error={errors.title?.message}
							{...register("title")}
						/>
						<FieldShell
							id={messageId}
							label="Mensagem"
							error={errors.message?.message}
						>
							<textarea
								id={messageId}
								rows={4}
								aria-invalid={errors.message ? true : undefined}
								aria-describedby={messageDescribedBy}
								className="resize-none rounded-md border border-input bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
								{...register("message")}
							/>
							<span
								id={counterId}
								className={cn(
									"text-right text-xs text-muted-foreground",
									message.length > NOTICE_MESSAGE_MAX && "text-destructive",
								)}
							>
								{`${message.length} / ${NOTICE_MESSAGE_MAX}`}
							</span>
						</FieldShell>
						<div className="flex justify-end">
							<Button type="submit" disabled={isPending}>
								{isPending ? "Enviando..." : "Enviar aviso"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
			<NoticePreview title={title} message={message} />
		</div>
	)
}
