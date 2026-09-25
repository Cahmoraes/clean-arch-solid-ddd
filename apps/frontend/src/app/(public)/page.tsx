import Link from "next/link"

import { PixelScene } from "@/components/ui/pixel-scene"
import { PixelTrail } from "@/components/ui/pixel-trail"
import { ContactSection } from "@/features/contact/components/contact-section"
import type { Plan } from "@/features/subscriptions/api/use-plans"
import { PlansSectionHero } from "@/features/subscriptions/components/plans-section-hero"
import { SERVER_API_URL } from "@/lib/server-api-url"

async function fetchPlans(): Promise<ReadonlyArray<Plan>> {
	try {
		const res = await fetch(`${SERVER_API_URL}/plans`, {
			next: { revalidate: 3600 },
		})
		if (!res.ok) return []
		return (await res.json()) as ReadonlyArray<Plan>
	} catch {
		return []
	}
}

/**
 * Landing pública — RSC. Apresenta o produto e direciona para
 * cadastro/login. Sem dependência do auth-store (cliente).
 */
export default async function LandingPage() {
	const plans = await fetchPlans()

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-16 sm:px-6 sm:py-24">
			<section
				aria-labelledby="hero-title"
				className="relative flex flex-col items-start gap-8 overflow-hidden rounded-md p-8 sm:p-12"
			>
				<PixelScene
					scene="sunset"
					animated
					className="absolute inset-0 -z-10"
				/>
				<PixelTrail />
				<span
					data-boot="eyebrow"
					className="font-display text-base tracking-widest text-accent"
				>
					&gt; REDE VOLT ONLINE
				</span>
				<h1
					id="hero-title"
					data-boot="title"
					className="font-display text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl"
				>
					Qualquer academia. Um{" "}
					<em className="text-accent not-italic">check-in</em>.
				</h1>
				<p className="max-w-2xl text-lg text-muted-foreground">
					Um plano, centenas de academias parceiras. Chegou, fez check-in,
					treinou.
				</p>
				<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
					<Link
						href="/cadastro"
						data-testid="cta-signup"
						className="pixel-hover inline-flex items-center justify-center rounded-md border border-primary bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
					>
						&gt; Começar agora
					</Link>
					<Link
						href="/login"
						data-testid="cta-login"
						className="pixel-hover inline-flex items-center justify-center rounded-md border border-accent px-6 py-3 text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
					>
						Já tenho conta
					</Link>
				</div>
			</section>

			<section aria-labelledby="features-title" className="flex flex-col gap-8">
				<h2
					id="features-title"
					className="font-display text-3xl tracking-tight text-foreground"
				>
					Pensado para o essencial.
				</h2>
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<li className="rounded-md border border-border bg-card p-6">
						<h3 className="font-display text-xl text-foreground">Encontre</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							academias parceiras perto de você, no mapa.
						</p>
					</li>
					<li className="rounded-md border border-border bg-card p-6">
						<h3 className="font-display text-xl text-foreground">
							Faça check-in
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							validação na hora, sem catraca de papel.
						</p>
					</li>
					<li className="rounded-md border border-border bg-card p-6">
						<h3 className="font-display text-xl text-foreground">
							Mantenha a sequência
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							acompanhe dias, semanas e metas.
						</p>
					</li>
				</ul>
			</section>

			<PlansSectionHero plans={plans} />

			<ContactSection />
		</div>
	)
}
