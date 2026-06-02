import { Body } from "@react-email/body"
import { Container } from "@react-email/container"
import { Head } from "@react-email/head"
import { Heading } from "@react-email/heading"
import { Html } from "@react-email/html"
import { Text } from "@react-email/text"

interface WelcomeEmailTemplateProps {
	name: string
	email: string
}

export function WelcomeEmailTemplate({
	name,
	email,
}: WelcomeEmailTemplateProps) {
	return (
		<Html lang="pt-BR">
			<Head />
			<Body>
				<Container>
					<Heading>Bem-vindo(a), {name}!</Heading>
					<Text>
						Sua conta foi criada com sucesso usando o email{" "}
						<strong>{email}</strong>.
					</Text>
					<Text>Agora você já pode começar a usar a plataforma.</Text>
				</Container>
			</Body>
		</Html>
	)
}
