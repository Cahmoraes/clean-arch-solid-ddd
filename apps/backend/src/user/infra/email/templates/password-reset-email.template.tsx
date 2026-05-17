import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Section,
	Text,
} from "@react-email/components"

interface PasswordResetEmailTemplateProps {
	name: string
	email: string
	resetLink: string
}

export function PasswordResetEmailTemplate({
	name,
	email,
	resetLink,
}: PasswordResetEmailTemplateProps) {
	return (
		<Html lang="pt-BR">
			<Head />
			<Body>
				<Container>
					<Heading>Recuperação de senha</Heading>
					<Text>Olá, {name}.</Text>
					<Text>
						Recebemos uma solicitação de redefinição de senha para a conta{" "}
						<strong>{email}</strong>.
					</Text>
					<Section>
						<Button href={resetLink}>Redefinir minha senha</Button>
					</Section>
					<Text>
						Este link expira em <strong>15 minutos</strong>.
					</Text>
					<Text>
						Se você não solicitou a redefinição de senha, ignore este e-mail.
						Sua senha permanecerá a mesma.
					</Text>
				</Container>
			</Body>
		</Html>
	)
}
