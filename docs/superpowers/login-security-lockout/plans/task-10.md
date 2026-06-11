# Task 10: Template React Email `AccountLockedEmailTemplate` [RF-008, RF-009, RF-010]

**Status:** DONE
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Cria o template React Email para o e-mail de alerta de bloqueio. O e-mail informa o usuário sobre as tentativas suspeitas de acesso, informa que a conta foi bloqueada por segurança e oferece um CTA para redefinir a senha e recuperar o acesso.

## Arquivos

- Create: `apps/backend/src/user/infra/email/templates/account-locked-email.template.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: seguir exatamente o padrão dos templates existentes

## Passos

- [ ] **Step 1: Criar o template `AccountLockedEmailTemplate`**

Arquivo: `apps/backend/src/user/infra/email/templates/account-locked-email.template.tsx`

```tsx
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
```

- [ ] **Step 2: Verificar que o TypeScript compila sem erros**

```bash
pnpm --filter backend tsc:check
```

Esperado: zero erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/user/infra/email/templates/account-locked-email.template.tsx
git commit -m "feat(login-security-lockout): adicionar AccountLockedEmailTemplate"
```

## Critérios de Sucesso

- Template criado com props `name`, `email`, `resetLink`
- Estrutura idêntica ao padrão dos outros templates (`Html`, `Body`, `Container`, `Heading`, `Text`, `Button`)
- `tsc:check` passa sem erros [RF-008, RF-009, RF-010]
