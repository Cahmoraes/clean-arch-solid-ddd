import { z } from "zod"

export const NOTICE_TITLE_MAX = 100
export const NOTICE_MESSAGE_MAX = 500

export const noticeSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Informe o título do aviso.")
		.max(
			NOTICE_TITLE_MAX,
			`O título deve ter no máximo ${NOTICE_TITLE_MAX} caracteres.`,
		),
	message: z
		.string()
		.trim()
		.min(1, "Informe a mensagem do aviso.")
		.max(
			NOTICE_MESSAGE_MAX,
			`A mensagem deve ter no máximo ${NOTICE_MESSAGE_MAX} caracteres.`,
		),
})

export type NoticeInput = z.infer<typeof noticeSchema>
