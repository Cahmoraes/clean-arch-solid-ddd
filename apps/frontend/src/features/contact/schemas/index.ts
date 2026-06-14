import { z } from "zod"

export const contactFormSchema = z.object({
	nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
	email: z.string().email("Informe um e-mail válido."),
	mensagem: z.string().min(1, "Mensagem é obrigatória."),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>
