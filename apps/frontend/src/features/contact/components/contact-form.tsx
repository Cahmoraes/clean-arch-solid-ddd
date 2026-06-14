"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FieldShell } from "@/components/ui/field-shell"
import { FormField } from "@/components/ui/form-field"
import { useSendContact } from "../api/use-send-contact"
import { type ContactFormInput, contactFormSchema } from "../schemas"

export function ContactForm() {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ContactFormInput>({
		resolver: zodResolver(contactFormSchema),
	})
	const { mutateAsync, isPending, isError } = useSendContact()

	const onSubmit = handleSubmit(async (values) => {
		try {
			await mutateAsync(values)
			toast.success("Mensagem enviada! Retornaremos em breve.")
			reset()
		} catch {
			// erro exibido inline via isError
		}
	})

	return (
		<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
			<FormField
				id="contact-nome"
				label="Nome"
				type="text"
				placeholder="Seu nome"
				{...register("nome")}
				error={errors.nome?.message}
			/>
			<FormField
				id="contact-email"
				label="E-mail"
				type="email"
				placeholder="seu@email.com"
				{...register("email")}
				error={errors.email?.message}
			/>
			<FieldShell
				id="contact-mensagem"
				label="Mensagem"
				error={errors.mensagem?.message}
			>
				<textarea
					id="contact-mensagem"
					placeholder="Como podemos ajudar?"
					rows={4}
					aria-invalid={errors.mensagem ? true : undefined}
					aria-describedby={
						errors.mensagem ? "contact-mensagem-error" : undefined
					}
					className="resize-none rounded-md border border-input bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					{...register("mensagem")}
				/>
			</FieldShell>
			{isError && (
				<p className="text-sm text-destructive" role="alert">
					Não foi possível enviar sua mensagem. Tente novamente.
				</p>
			)}
			<Button type="submit" disabled={isPending} className="mt-2">
				{isPending ? "Enviando…" : "Enviar mensagem"}
			</Button>
		</form>
	)
}
