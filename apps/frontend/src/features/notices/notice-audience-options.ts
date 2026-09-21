import type { NoticeAudience } from "@/features/notices/schemas/notice-schema"

export interface NoticeAudienceOption {
	value: NoticeAudience
	label: string
	description: string
}

export const NOTICE_AUDIENCE_OPTIONS: ReadonlyArray<NoticeAudienceOption> = [
	{
		value: "ALL",
		label: "Todos",
		description: "Alunos e administradores ativos",
	},
	{
		value: "MEMBERS",
		label: "Alunos",
		description: "Somente alunos ativos",
	},
	{
		value: "ADMINS",
		label: "Administradores",
		description: "Somente administradores ativos",
	},
]

export function noticeAudienceLabel(audience: NoticeAudience): string {
	const option = NOTICE_AUDIENCE_OPTIONS.find(
		(candidate) => candidate.value === audience,
	)
	if (!option) {
		throw new Error(`Público de aviso desconhecido: ${audience}`)
	}
	return option.label
}
