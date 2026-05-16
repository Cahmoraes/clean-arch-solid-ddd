import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Text,
} from "@react-email/components"

interface PasswordAlertEmailTemplateProps {
	name: string
	email: string
}

export function PasswordAlertEmailTemplate({
	name,
	email,
}: PasswordAlertEmailTemplateProps) {
	return (
		<Html lang="pt-BR">
			<Head />
			<Body>
				<Container>
					<Heading>Aviso de segurança</Heading>
					<Text>Olá, {name}.</Text>
					<Text>
						Uma senha foi definida para a sua conta (<strong>{email}</strong>).
					</Text>
					<Text>
						Se não foi você quem realizou esta ação, entre em contato conosco
						imediatamente.
					</Text>
				</Container>
			</Body>
		</Html>
	)
}
