---
created_at: "2026-05-17T15:21:53-03:00"
updated_at: "2026-05-17T15:21:53-03:00"
---

# PRD: Recuperação de Senha Esquecida

## Visão Geral

Usuários registrados que esquecem sua senha atualmente não têm como recuperar o acesso à conta sem intervenção manual. Esta feature implementa um fluxo seguro de recuperação de senha por e-mail: o usuário solicita um link de reset, recebe um e-mail com token de uso único e redefine sua senha em uma página dedicada. O acesso é restabelecido de forma autônoma, sem suporte humano.

---

## Objetivos

- Permitir que qualquer usuário com conta ativa recupere o acesso de forma autônoma em menos de 5 minutos.
- Garantir que o fluxo não vaze informações sobre a existência ou não de uma conta (proteção contra enumeração).
- Todas as sessões ativas do usuário são invalidadas após o reset bem-sucedido (segurança pós-comprometimento).
- Zero intervenção manual da equipe de suporte para casos de senha esquecida.
- Taxa de entrega de e-mail de reset ≥ 95% (dependente da infraestrutura SMTP configurada).

---

## Histórias de Usuário

### Persona: Usuário Registrado

**US-001** — Como usuário registrado que esqueceu minha senha, eu quero solicitar um link de recuperação informando meu e-mail, para que eu possa redefinir minha senha sem precisar de suporte.

**US-002** — Como usuário registrado, eu quero receber um e-mail com um link seguro de reset de senha, para que eu possa acessar a página de redefinição diretamente do meu e-mail.

**US-003** — Como usuário registrado, eu quero redefinir minha senha usando o link recebido por e-mail, para que eu possa recuperar o acesso à minha conta.

**US-004** — Como usuário registrado, eu quero que todas as minhas sessões ativas sejam encerradas após o reset da senha, para que minha conta fique protegida caso tenha sido comprometida.

**US-005** — Como usuário registrado, eu quero ser notificado por e-mail quando minha senha for alterada com sucesso, para que eu saiba que a alteração ocorreu e possa agir caso não tenha sido eu.

**US-006** — Como usuário, eu quero que a resposta do formulário de recuperação seja a mesma independentemente de o e-mail estar ou não cadastrado, para que minha privacidade seja preservada.

---

## Funcionalidades Principais

### F-001: Solicitação de recuperação de senha

O usuário informa seu e-mail em um formulário dedicado. O sistema processa a solicitação e responde com uma mensagem genérica, independentemente de o e-mail estar cadastrado ou não.

**Requisitos funcionais:**

- **RF-001** — O sistema deve aceitar um endereço de e-mail via `POST /password/forgot`.
- **RF-002** — A resposta deve ser sempre `200 OK` com mensagem genérica: *"Se este e-mail estiver cadastrado, você receberá um link em breve."*
- **RF-003** — Se o e-mail existir, o sistema deve gerar um token de reset seguro (256 bits, CSPRNG) e enviá-lo por e-mail.
- **RF-004** — Tokens anteriores não utilizados do mesmo usuário devem ser invalidados ao gerar um novo.
- **RF-005** — O token deve expirar em 15 minutos.
- **RF-006** — O sistema deve aplicar rate limiting por IP (máx. 5 req / 15 min) e por e-mail (máx. 3 req / 1 hora).
- **RF-007** — Quando o limite de tentativas for excedido, o sistema deve retornar `429 Too Many Requests`.

### F-002: Redefinição de senha via link

O usuário acessa o link recebido por e-mail, informa a nova senha e confirma. O sistema valida o token e atualiza a senha.

**Requisitos funcionais:**

- **RF-008** — O sistema deve aceitar `{ token, newPassword }` via `POST /password/reset`.
- **RF-009** — O token deve ser validado: se inválido ou expirado, retornar `400 Bad Request` com mensagem de erro.
- **RF-010** — O token deve ser de uso único: após uso bem-sucedido, deve ser invalidado imediatamente.
- **RF-011** — A nova senha deve atender às mesmas regras de validação aplicadas no cadastro (mínimo 8 caracteres).
- **RF-012** — Após reset bem-sucedido, todas as sessões JWT ativas do usuário devem ser invalidadas.
- **RF-013** — Após reset bem-sucedido, o sistema deve enviar um e-mail de alerta de alteração de senha ao usuário.

### F-003: Template de e-mail de recuperação

O usuário recebe um e-mail com identidade visual consistente com os demais e-mails da plataforma, contendo o link de reset e instruções claras.

**Requisitos funcionais:**

- **RF-014** — O e-mail deve conter o nome do usuário, o link de reset e um aviso de expiração em 15 minutos.
- **RF-015** — O e-mail deve conter aviso de segurança: *"Se você não solicitou isso, ignore este e-mail."*
- **RF-016** — O e-mail deve ter versão em HTML e fallback em texto puro.

### F-004: Páginas no frontend

O frontend expõe duas páginas para o fluxo de recuperação, integradas à navegação existente da aplicação.

**Requisitos funcionais:**

- **RF-017** — A página `/forgot-password` deve conter um formulário com campo de e-mail e botão de envio.
- **RF-018** — Após submissão bem-sucedida, a página deve exibir a mensagem genérica sem revelar se o e-mail existe.
- **RF-019** — A página `/reset-password?token=...` deve conter formulário com campos de nova senha e confirmação.
- **RF-020** — A página `/reset-password` deve validar client-side que as senhas coincidem antes de submeter.
- **RF-021** — Após reset bem-sucedido, o usuário deve ser redirecionado para `/login` automaticamente após 3 segundos.
- **RF-022** — Caso o token seja inválido ou expirado, a página deve exibir mensagem de erro com link para `/forgot-password`.
- **RF-023** — A página de login existente deve conter link "Esqueceu sua senha?" apontando para `/forgot-password`.

---

## Experiência do Usuário

**Jornada principal:**

1. Usuário clica em "Esqueceu sua senha?" na página de login.
2. É redirecionado para `/forgot-password`, preenche o e-mail e clica em "Enviar".
3. Recebe feedback genérico de sucesso (sem revelar existência da conta).
4. Abre o e-mail, clica no link de reset (válido por 15 minutos).
5. É levado à página `/reset-password`, preenche nova senha e confirma.
6. Vê mensagem de sucesso e é redirecionado para `/login` após 3 segundos.
7. Faz login com a nova senha.

**Jornada de token expirado:**

1. Usuário abre o link após 15 minutos.
2. A página exibe mensagem clara: *"Este link expirou ou já foi utilizado."*
3. Um link para `/forgot-password` permite iniciar o processo novamente.

**Considerações de UX:**

- Todos os estados de loading devem ser indicados visualmente (botão desabilitado / spinner).
- Mensagens de erro devem ser claras e orientadas à ação (o que o usuário deve fazer a seguir).
- O formulário de nova senha deve ter campo de confirmação para evitar erros de digitação.

---

## Restrições Técnicas de Alto Nível

- O fluxo deve funcionar com a infraestrutura SMTP já configurada na plataforma (NodeMailer).
- O armazenamento de tokens deve usar Redis (já disponível na infraestrutura).
- A invalidação de sessões deve ser compatível com o mecanismo JWT/JWI existente.
- Os tipos de request/response das novas rotas devem ser exportados via `@repo/api-types` (OpenAPI).
- O link de reset deve usar HTTPS em produção; a URL base é configurada via variável de ambiente `APP_URL`.

---

## Fora de Escopo

- **Autenticação multifator (MFA):** Nenhuma etapa adicional de verificação é exigida para o reset de senha neste momento.
- **Reset por SMS ou outros canais:** Apenas e-mail é suportado nesta versão.
- **Auto-login após reset:** O usuário é redirecionado para login e deve autenticar-se novamente com a nova senha.
- **Histórico de senhas:** Não há restrição contra reutilização de senhas anteriores nesta versão.
- **Página de administração:** Administradores não têm fluxo especial de reset nesta versão.
- **Revogação seletiva de sessões:** Todas as sessões são revogadas; não há opção de manter sessões em dispositivos confiáveis.
