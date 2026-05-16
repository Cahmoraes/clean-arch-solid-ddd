import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Text,
} from "@react-email/components"

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
