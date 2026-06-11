import { Body } from "@react-email/body"
import { Button } from "@react-email/button"
import { Container } from "@react-email/container"
import { Head } from "@react-email/head"
import { Heading } from "@react-email/heading"
import { Html } from "@react-email/html"
import { Section } from "@react-email/section"
import { Text } from "@react-email/text"

interface AccountLockedEmailTemplateProps {
	name: string
	email: string
	resetLink: string
}

export function AccountLockedEmailTemplate({
	name,
	email,
	resetLink,
}: AccountLockedEmailTemplateProps) {
	return (
		<Html lang="pt-BR">
			<Head />
			<Body>
				<Container>
					<Heading>Alerta de segurança: acesso bloqueado</Heading>
					<Text>Olá, {name}.</Text>
					<Text>
						Detectamos 3 tentativas de acesso inválidas na sua conta{" "}
						<strong>{email}</strong>.
					</Text>
					<Text>
						Por motivos de segurança, o acesso à sua conta foi temporariamente
						bloqueado.
					</Text>
					<Section>
						<Button href={resetLink}>Redefinir senha e recuperar acesso</Button>
					</Section>
					<Text>
						Este link expira em <strong>15 minutos</strong>.
					</Text>
					<Text>
						Se não foi você quem realizou essas tentativas de acesso, sua conta
						pode estar sendo alvo de um ataque. Entre em contato com o suporte
						imediatamente.
					</Text>
					<Text>
						Se foi você, basta redefinir sua senha usando o botão acima para
						recuperar o acesso.
					</Text>
				</Container>
			</Body>
		</Html>
	)
}
