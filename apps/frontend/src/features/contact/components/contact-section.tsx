import { CONTACT_EMAIL } from "../constants"
import { ContactForm } from "./contact-form"

export function ContactSection() {
	return (
		<section
			aria-labelledby="contact-heading"
			className="mx-auto w-full max-w-xl"
		>
			<h2
				id="contact-heading"
				className="mb-2 font-display text-3xl font-bold tracking-tight text-foreground"
			>
				Fale conosco
			</h2>
			<p className="mb-8 text-base text-muted-foreground">
				Tem alguma dúvida? Envie uma mensagem e nossa equipe responde em até 24h
				úteis.
			</p>
			<div className="grid gap-8 md:grid-cols-2">
				<div className="flex flex-col gap-4">
					<p className="text-sm text-muted-foreground">
						Nossa equipe está pronta para ajudar. Se preferir, entre em contato
						direto por e-mail.
					</p>
					<a
						href={`mailto:${CONTACT_EMAIL}`}
						className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-surface-3"
					>
						{CONTACT_EMAIL}
					</a>
				</div>
				<ContactForm />
			</div>
		</section>
	)
}
