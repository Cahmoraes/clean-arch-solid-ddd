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
