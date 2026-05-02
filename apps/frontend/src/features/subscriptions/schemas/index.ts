import { z } from "zod"

export const createSubscriptionSchema = z.object({
	priceId: z.string().min(1, "Selecione um plano."),
	paymentMethodId: z.string().min(1, "Informe um método de pagamento."),
})

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>

export const createSubscriptionResponseSchema = z.object({
	subscriptionId: z.string().min(1),
	status: z.string().min(1),
})

export type CreateSubscriptionResponse = z.infer<
	typeof createSubscriptionResponseSchema
>

export interface DemoPlan {
	id: string
	name: string
	priceId: string
	priceLabel: string
	tagline: string
	features: ReadonlyArray<string>
}

export const DEMO_PLANS: ReadonlyArray<DemoPlan> = [
	{
		id: "premium-mensal",
		name: "Premium Mensal",
		priceId: "price_demo_monthly",
		priceLabel: "R$ 49,90/mês",
		tagline: "Acesso ilimitado a todas as academias parceiras.",
		features: [
			"Check-ins ilimitados",
			"Histórico completo de visitas",
			"Suporte prioritário",
		],
	},
	{
		id: "premium-anual",
		name: "Premium Anual",
		priceId: "price_demo_yearly",
		priceLabel: "R$ 479,00/ano",
		tagline: "20% de economia comparado ao plano mensal.",
		features: [
			"Tudo do Premium Mensal",
			"Pagamento único anual",
			"Economia equivalente a 2 meses grátis",
		],
	},
]

export const DEMO_PAYMENT_METHOD_ID = "pm_demo_card_visa" as const
