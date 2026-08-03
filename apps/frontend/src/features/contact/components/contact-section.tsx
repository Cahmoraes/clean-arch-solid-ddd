import { Clock, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CONTACT_EMAIL } from "../constants"
import { ContactForm } from "./contact-form"

export function ContactSection() {
	return (
		<section
			aria-labelledby="contact-heading"
			className="mx-auto w-full max-w-xl"
		>
			<div className="flex flex-col items-center text-center">
				<h2
					id="contact-heading"
					className="mb-2 font-display text-3xl font-bold tracking-tight text-foreground"
				>
					Fale conosco
				</h2>
				<p className="mb-8 text-base text-muted-foreground">
					Tem alguma dúvida? Envie uma mensagem e nossa equipe responde em até
					24h úteis.
				</p>
			</div>
			<ContactForm />
			<div className="mt-8 grid gap-4 sm:grid-cols-2">
				<Card className="py-4">
					<CardContent className="flex items-center gap-3">
						<Mail className="size-4 shrink-0 text-accent" aria-hidden="true" />
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								E-mail
							</p>
							<a
								href={`mailto:${CONTACT_EMAIL}`}
								className="text-sm font-medium text-foreground transition-colors hover:text-accent"
							>
								{CONTACT_EMAIL}
							</a>
						</div>
					</CardContent>
				</Card>
				<Card className="py-4">
					<CardContent className="flex items-center gap-3">
						<Clock className="size-4 shrink-0 text-accent" aria-hidden="true" />
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Resposta
							</p>
							<p className="text-sm font-medium text-foreground">Em até 24h</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</section>
	)
}
