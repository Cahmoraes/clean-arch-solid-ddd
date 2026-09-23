import { z } from "zod"

export const MIN_PRICE_REAIS = 0
export const NAME_MIN = 1
export const TAGLINE_MIN = 1
export const FEATURES_MIN = 1

export const planAdminSchema = z.object({
	name: z.string().trim().min(NAME_MIN, "Informe o nome do plano."),
	price: z.number().min(MIN_PRICE_REAIS, "O preço não pode ser negativo."),
	billingPeriod: z.enum(["monthly", "yearly"], {
		error: "Selecione a periodicidade.",
	}),
	tagline: z.string().trim().min(TAGLINE_MIN, "Informe uma descrição curta."),
	features: z
		.array(z.string().trim().min(1, "O benefício não pode ser vazio."))
		.min(FEATURES_MIN, "Informe ao menos um benefício."),
	stripePriceId: z.string().trim().optional().or(z.literal("")),
})

export type PlanAdminInput = z.infer<typeof planAdminSchema>
