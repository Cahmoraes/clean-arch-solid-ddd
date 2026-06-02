import { Body } from "@react-email/body"
import { Container } from "@react-email/container"
import { Head } from "@react-email/head"
import { Heading } from "@react-email/heading"
import { Html } from "@react-email/html"
import { Text } from "@react-email/text"

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
