import { z } from "zod"

const CNPJ_DIGITS = 14
const PHONE_MIN = 10
const PHONE_MAX = 11
const TITLE_MIN = 2
const TITLE_MAX = 120
const DESCRIPTION_MAX = 500
const LAT_MIN = -90
const LAT_MAX = 90
const LNG_MIN = -180
const LNG_MAX = 180

const numericOnly = /^\d+$/u

export const createGymSchema = z.object({
	title: z
		.string()
		.trim()
		.min(TITLE_MIN, "Informe o nome (mínimo 2 caracteres).")
		.max(TITLE_MAX, "Nome muito longo."),
	cnpj: z
		.string()
		.trim()
		.regex(numericOnly, "CNPJ deve conter apenas dígitos.")
		.length(CNPJ_DIGITS, `CNPJ deve ter ${CNPJ_DIGITS} dígitos.`),
	description: z
		.string()
		.trim()
		.max(DESCRIPTION_MAX, "Descrição muito longa.")
		.optional()
		.or(z.literal("")),
	phone: z
		.string()
		.trim()
		.regex(numericOnly, "Telefone deve conter apenas dígitos.")
		.min(PHONE_MIN, `Telefone deve ter ao menos ${PHONE_MIN} dígitos.`)
		.max(PHONE_MAX, `Telefone deve ter no máximo ${PHONE_MAX} dígitos.`)
		.optional()
		.or(z.literal("")),
	latitude: z
		.number({ error: "Informe a latitude." })
		.min(LAT_MIN, `Latitude deve ser >= ${LAT_MIN}.`)
		.max(LAT_MAX, `Latitude deve ser <= ${LAT_MAX}.`),
	longitude: z
		.number({ error: "Informe a longitude." })
		.min(LNG_MIN, `Longitude deve ser >= ${LNG_MIN}.`)
		.max(LNG_MAX, `Longitude deve ser <= ${LNG_MAX}.`),
})

export type CreateGymInput = z.infer<typeof createGymSchema>
